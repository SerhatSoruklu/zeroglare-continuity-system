import { evaluateSignalInference } from "../shared/signalInference.js";
import { getSignalInferenceElements } from "../dom/selectors.js";

function renderOutput(result, outputNode) {
  if (!outputNode) {
    return;
  }

  outputNode.value = JSON.stringify(result, null, 2);
}

function summarize(result) {
  return {
    inferredCount: result.inferred.length,
    rejectedCount: result.rejected.length,
    totalCount: result.inferred.length + result.rejected.length,
  };
}

function publishState(result) {
  const detail = result;
  window.__ZEE_SIGNAL_INFERENCE_STATE__ = detail;
  window.dispatchEvent(
    new CustomEvent("zee:signal-inference-updated", {
      detail,
    }),
  );
}

export function bindSignalInferenceLayer(doc = globalThis.document) {
  const {
    runButton,
    resetButton,
    status,
    inferredCount,
    rejectedCount,
    totalCount,
    output,
    progressFill,
  } = getSignalInferenceElements(doc);

  if (!runButton && !resetButton && !status && !inferredCount && !rejectedCount && !totalCount && !output && !progressFill) {
    return () => {};
  }

  let measurements = [];
  let activeRunId = 0;

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  function setProgress(completed, total) {
    if (!progressFill) {
      return;
    }

    const width = total > 0 ? Math.max(0, Math.min(100, (completed / total) * 100)) : 0;
    progressFill.style.width = `${width}%`;
  }

  function refreshSummary(result = { inferred: [], rejected: [] }) {
    const summary = summarize(result);
    if (inferredCount) {
      inferredCount.textContent = String(summary.inferredCount);
    }
    if (rejectedCount) {
      rejectedCount.textContent = String(summary.rejectedCount);
    }
    if (totalCount) {
      totalCount.textContent = String(summary.totalCount);
    }
  }

  function updateFromMeasurements(nextMeasurements) {
    measurements = Array.from(nextMeasurements || []);
    const empty = { inferred: [], rejected: [] };
    refreshSummary(empty);
    renderOutput(empty, output);
    setProgress(0, measurements.length);
    publishState(empty);
    if (runButton) {
      runButton.disabled = measurements.length === 0;
    }
    setStatus(
      measurements.length
        ? `${measurements.length} measurement(s) ready for inference gating.`
        : "Run measurement first to populate stable measurements.",
    );
  }

  async function runInference() {
    const runId = activeRunId + 1;
    activeRunId = runId;

    if (!measurements.length) {
      updateFromMeasurements([]);
      if (runButton) {
        runButton.disabled = false;
      }
      return;
    }

    if (runButton) {
      runButton.disabled = true;
    }

    setStatus("Evaluating bounded inference candidates...");
    setProgress(0, measurements.length);

    try {
      const result = evaluateSignalInference(measurements, {
        onProgress: ({ completed, total }) => {
          if (runId === activeRunId) {
            setProgress(completed, total);
          }
        },
      });

      if (runId !== activeRunId) {
        return;
      }

      refreshSummary(result);
      renderOutput(result, output);
      setProgress(measurements.length, measurements.length);
      publishState(result);
      setStatus(`${result.inferred.length} inferred claim(s) accepted; ${result.rejected.length} rejected.`);
    } catch (error) {
      if (runId !== activeRunId) {
        return;
      }

      const empty = { inferred: [], rejected: [] };
      refreshSummary(empty);
      renderOutput(empty, output);
      setProgress(0, measurements.length);
      publishState(empty);
      setStatus(error instanceof Error ? error.message : "Inference gate failed.");
    } finally {
      if (runId === activeRunId && runButton) {
        runButton.disabled = false;
      }
      if (runId === activeRunId && resetButton) {
        resetButton.disabled = false;
      }
    }
  }

  function handleMeasurementUpdate(event) {
    const detail = event?.detail || {};
    updateFromMeasurements(detail.measurements || []);
  }

  function handleRunClick(event) {
    event.preventDefault();
    runInference();
  }

  function handleResetClick(event) {
    event.preventDefault();
    activeRunId += 1;
    measurements = [];
    const empty = { inferred: [], rejected: [] };
    refreshSummary(empty);
    renderOutput(empty, output);
    setProgress(0, 0);
    publishState(empty);
    if (runButton) {
      runButton.disabled = true;
    }
    setStatus("Run measurement first to populate stable measurements.");
  }

  if (runButton) {
    runButton.addEventListener("click", handleRunClick);
  }
  if (resetButton) {
    resetButton.addEventListener("click", handleResetClick);
  }

  window.addEventListener("zee:signal-measurement-updated", handleMeasurementUpdate);

  if (Array.isArray(window.__ZEE_SIGNAL_MEASUREMENT_STATE__?.measurements)) {
    handleMeasurementUpdate({ detail: window.__ZEE_SIGNAL_MEASUREMENT_STATE__ });
  } else {
    handleMeasurementUpdate({ detail: { measurements: [] } });
  }

  return () => {
    if (runButton) {
      runButton.removeEventListener("click", handleRunClick);
    }
    if (resetButton) {
      resetButton.removeEventListener("click", handleResetClick);
    }
    window.removeEventListener("zee:signal-measurement-updated", handleMeasurementUpdate);
  };
}
