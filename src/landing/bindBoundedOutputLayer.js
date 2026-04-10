import { evaluateBoundedOutput } from "../shared/boundedOutput.js";
import { getBoundedOutputElements } from "../dom/selectors.js";

function renderOutput(result, outputNode) {
  if (!outputNode) {
    return;
  }

  outputNode.value = JSON.stringify(result, null, 2);
}

function summarize(result) {
  return {
    supportedCount: result.supported.length,
    rejectedCount: result.rejected.length,
    unknownCount: result.unknown.length,
    totalCount: result.supported.length + result.rejected.length + result.unknown.length,
  };
}

function publishState(result) {
  const detail = result;
  window.__ZEE_BOUND_OUTPUT_STATE__ = detail;
  window.dispatchEvent(
    new CustomEvent("zee:bounded-output-updated", {
      detail,
    }),
  );
}

function createFallbackResult() {
  return {
    supported: [],
    rejected: [],
    unknown: [
      {
        claim: "absolute conclusion",
        reason: "not proven; the evidence only supports bounded claims",
      },
      {
        claim: "semantic identity",
        reason: "no multi-signal inference survived the gate",
      },
      {
        claim: "observed frame content",
        reason: "no observed frames are available for the current run",
      },
    ],
    confidence: {
      frame_isolation: "low",
      observed_signals: "low",
      stable_signals: "low",
      measurements: "low",
      inferred_claims: "low",
      absolute: "not proven",
    },
    summary: {
      frame_isolation: { kept: 0, rejected: 0 },
      observed_frames: 0,
      stable_signals: 0,
      measurements: 0,
      inferred: 0,
      rejected: 0,
      unknown: 3,
    },
  };
}

export function bindBoundedOutputLayer(doc = globalThis.document) {
  const {
    runButton,
    resetButton,
    status,
    supportedCount,
    rejectedCount,
    unknownCount,
    totalCount,
    output,
    progressFill,
  } = getBoundedOutputElements(doc);

  if (!runButton && !resetButton && !status && !supportedCount && !rejectedCount && !unknownCount && !totalCount && !output && !progressFill) {
    return () => {};
  }

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

  function refreshSummary(result = { supported: [], rejected: [], unknown: [] }) {
    const summary = summarize(result);
    if (supportedCount) {
      supportedCount.textContent = String(summary.supportedCount);
    }
    if (rejectedCount) {
      rejectedCount.textContent = String(summary.rejectedCount);
    }
    if (unknownCount) {
      unknownCount.textContent = String(summary.unknownCount);
    }
    if (totalCount) {
      totalCount.textContent = String(summary.totalCount);
    }
  }

  function collectUpstreamStates() {
    return {
      frameIsolation: window.__ZEE_FRAME_ISOLATION_STATE__ || {},
      signalExtraction: window.__ZEE_SIGNAL_EXTRACTION_STATE__ || {},
      signalStability: window.__ZEE_SIGNAL_STABILITY_STATE__ || {},
      signalMeasurement: window.__ZEE_SIGNAL_MEASUREMENT_STATE__ || {},
      signalInference: window.__ZEE_SIGNAL_INFERENCE_STATE__ || {},
    };
  }

  function updateFromCurrentEvidence() {
    const runId = activeRunId + 1;
    activeRunId = runId;

    setStatus("Assembling a bounded conclusion from observed evidence...");

    try {
      const result = evaluateBoundedOutput(collectUpstreamStates(), {
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
      setProgress(5, 5);
      publishState(result);
      setStatus(
        `${result.supported.length} supported finding(s), ${result.rejected.length} rejected item(s), ${result.unknown.length} unknown(s).`,
      );
    } catch (error) {
      if (runId !== activeRunId) {
        return;
      }

      const empty = createFallbackResult();
      refreshSummary(empty);
      renderOutput(empty, output);
      setProgress(0, 5);
      publishState(empty);
      setStatus(error instanceof Error ? error.message : "Bounded output failed.");
    } finally {
      if (runId === activeRunId && runButton) {
        runButton.disabled = false;
      }
      if (runId === activeRunId && resetButton) {
        resetButton.disabled = false;
      }
    }
  }

  function handleRunClick(event) {
    event.preventDefault();
    updateFromCurrentEvidence();
  }

  function handleResetClick(event) {
    event.preventDefault();
    activeRunId += 1;
    const empty = createFallbackResult();
    refreshSummary(empty);
    renderOutput(empty, output);
    setProgress(0, 0);
    publishState(empty);
    setStatus("Run upstream phases to assemble the bounded output.");
  }

  function handleUpstreamUpdate() {
    updateFromCurrentEvidence();
  }

  if (runButton) {
    runButton.addEventListener("click", handleRunClick);
  }
  if (resetButton) {
    resetButton.addEventListener("click", handleResetClick);
  }

  window.addEventListener("zee:frame-isolation-updated", handleUpstreamUpdate);
  window.addEventListener("zee:signal-extraction-updated", handleUpstreamUpdate);
  window.addEventListener("zee:signal-stability-updated", handleUpstreamUpdate);
  window.addEventListener("zee:signal-measurement-updated", handleUpstreamUpdate);
  window.addEventListener("zee:signal-inference-updated", handleUpstreamUpdate);

  if (window.__ZEE_SIGNAL_INFERENCE_STATE__ || window.__ZEE_SIGNAL_MEASUREMENT_STATE__ || window.__ZEE_SIGNAL_STABILITY_STATE__ || window.__ZEE_SIGNAL_EXTRACTION_STATE__ || window.__ZEE_FRAME_ISOLATION_STATE__) {
    handleUpstreamUpdate();
  } else {
    handleResetClick({ preventDefault() {} });
  }

  return () => {
    if (runButton) {
      runButton.removeEventListener("click", handleRunClick);
    }
    if (resetButton) {
      resetButton.removeEventListener("click", handleResetClick);
    }
    window.removeEventListener("zee:frame-isolation-updated", handleUpstreamUpdate);
    window.removeEventListener("zee:signal-extraction-updated", handleUpstreamUpdate);
    window.removeEventListener("zee:signal-stability-updated", handleUpstreamUpdate);
    window.removeEventListener("zee:signal-measurement-updated", handleUpstreamUpdate);
    window.removeEventListener("zee:signal-inference-updated", handleUpstreamUpdate);
  };
}
