import { evaluateSignalMeasurements } from "../shared/signalMeasurement.js";
import { getSignalMeasurementElements } from "../dom/selectors.js";

function renderOutput(result, outputNode) {
  if (!outputNode) {
    return;
  }

  outputNode.value = JSON.stringify(result, null, 2);
}

function summarize(result) {
  return {
    measurementCount: result.measurements.length,
    discardedCount: result.discarded_measurements.length,
    totalCount: result.measurements.length + result.discarded_measurements.length,
  };
}

function publishState(result) {
  const detail = result;
  window.__ZEE_SIGNAL_MEASUREMENT_STATE__ = detail;
  window.dispatchEvent(
    new CustomEvent("zee:signal-measurement-updated", {
      detail,
    }),
  );
}

export function bindSignalMeasurementLayer(doc = globalThis.document) {
  const {
    runButton,
    resetButton,
    status,
    measurementCount,
    discardedCount,
    totalCount,
    output,
    progressFill,
  } = getSignalMeasurementElements(doc);

  if (!runButton && !resetButton && !status && !measurementCount && !discardedCount && !totalCount && !output && !progressFill) {
    return () => {};
  }

  let stableSignals = [];
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

  function refreshSummary(result = { measurements: [], discarded_measurements: [] }) {
    const summary = summarize(result);
    if (measurementCount) {
      measurementCount.textContent = String(summary.measurementCount);
    }
    if (discardedCount) {
      discardedCount.textContent = String(summary.discardedCount);
    }
    if (totalCount) {
      totalCount.textContent = String(summary.totalCount);
    }
  }

  function updateFromStableSignals(signals) {
    stableSignals = Array.from(signals || []);
    const empty = { measurements: [], discarded_measurements: [] };
    refreshSummary(empty);
    renderOutput(empty, output);
    setProgress(0, stableSignals.length);
    publishState(empty);
    if (runButton) {
      runButton.disabled = stableSignals.length === 0;
    }
    setStatus(
      stableSignals.length
        ? `${stableSignals.length} stable signal(s) ready for measurement.`
        : "Run signal stability first to populate stable signals.",
    );
  }

  async function runMeasurement() {
    const runId = activeRunId + 1;
    activeRunId = runId;

    if (!stableSignals.length) {
      updateFromStableSignals([]);
      if (runButton) {
        runButton.disabled = false;
      }
      return;
    }

    if (runButton) {
      runButton.disabled = true;
    }

    setStatus("Quantifying stable signals without interpretation...");
    setProgress(0, stableSignals.length);

    try {
      const result = evaluateSignalMeasurements(stableSignals, {
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
      setProgress(stableSignals.length, stableSignals.length);
      publishState(result);
      setStatus(`${result.measurements.length} measurements emitted from stable signals.`);
    } catch (error) {
      if (runId !== activeRunId) {
        return;
      }

      const empty = { measurements: [], discarded_measurements: [] };
      refreshSummary(empty);
      renderOutput(empty, output);
      setProgress(0, stableSignals.length);
      publishState(empty);
      setStatus(error instanceof Error ? error.message : "Signal measurement failed.");
    } finally {
      if (runId === activeRunId && runButton) {
        runButton.disabled = false;
      }
      if (runId === activeRunId && resetButton) {
        resetButton.disabled = false;
      }
    }
  }

  function handleStabilityUpdate(event) {
    const detail = event?.detail || {};
    stableSignals = Array.from(detail.stable_signals || []);
    const empty = { measurements: [], discarded_measurements: [] };
    refreshSummary(empty);
    renderOutput(empty, output);
    setProgress(0, stableSignals.length);
    publishState(empty);
    if (runButton) {
      runButton.disabled = stableSignals.length === 0;
    }
    setStatus(
      stableSignals.length
        ? `${stableSignals.length} stable signal(s) ready for measurement.`
        : "Run signal stability first to populate stable signals.",
    );
  }

  function handleRunClick(event) {
    event.preventDefault();
    runMeasurement();
  }

  function handleResetClick(event) {
    event.preventDefault();
    activeRunId += 1;
    stableSignals = [];
    const empty = { measurements: [], discarded_measurements: [] };
    refreshSummary(empty);
    renderOutput(empty, output);
    setProgress(0, 0);
    publishState(empty);
    if (runButton) {
      runButton.disabled = true;
    }
    setStatus("Run signal stability first to populate stable signals.");
  }

  if (runButton) {
    runButton.addEventListener("click", handleRunClick);
  }
  if (resetButton) {
    resetButton.addEventListener("click", handleResetClick);
  }

  window.addEventListener("zee:signal-stability-updated", handleStabilityUpdate);

  if (Array.isArray(window.__ZEE_SIGNAL_STABILITY_STATE__?.stable_signals)) {
    handleStabilityUpdate({ detail: window.__ZEE_SIGNAL_STABILITY_STATE__ });
  } else {
    handleStabilityUpdate({ detail: { stable_signals: [] } });
  }

  return () => {
    if (runButton) {
      runButton.removeEventListener("click", handleRunClick);
    }
    if (resetButton) {
      resetButton.removeEventListener("click", handleResetClick);
    }
    window.removeEventListener("zee:signal-stability-updated", handleStabilityUpdate);
  };
}
