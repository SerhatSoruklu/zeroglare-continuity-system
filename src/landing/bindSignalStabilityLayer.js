import { evaluateSignalStability } from "../shared/signalStability.js";
import { getSignalStabilityElements } from "../dom/selectors.js";

function renderOutput(result, outputNode) {
  if (!outputNode) {
    return;
  }

  outputNode.value = JSON.stringify(result, null, 2);
}

function summarize(result) {
  return {
    stableCount: result.stable_signals.length,
    discardedCount: result.discarded_signals.length,
    totalCount: result.stable_signals.length + result.discarded_signals.length,
  };
}

function publishState(result) {
  const detail = result;
  window.__ZEE_SIGNAL_STABILITY_STATE__ = detail;
  window.dispatchEvent(
    new CustomEvent("zee:signal-stability-updated", {
      detail,
    }),
  );
}

export function bindSignalStabilityLayer(doc = globalThis.document) {
  const {
    runButton,
    resetButton,
    status,
    stableCount,
    discardedCount,
    totalCount,
    output,
    progressFill,
  } = getSignalStabilityElements(doc);

  if (!runButton && !resetButton && !status && !stableCount && !discardedCount && !totalCount && !output && !progressFill) {
    return () => {};
  }

  let observedFrames = [];
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

  function refreshSummary(result = { stable_signals: [], discarded_signals: [] }) {
    const summary = summarize(result);
    if (stableCount) {
      stableCount.textContent = String(summary.stableCount);
    }
    if (discardedCount) {
      discardedCount.textContent = String(summary.discardedCount);
    }
    if (totalCount) {
      totalCount.textContent = String(summary.totalCount);
    }
  }

  function updateFromObservedFrames(frames) {
    observedFrames = Array.from(frames || []);
    refreshSummary({ stable_signals: [], discarded_signals: [] });
    renderOutput({ stable_signals: [], discarded_signals: [] }, output);
    setProgress(0, observedFrames.length);
    publishState({ stable_signals: [], discarded_signals: [] });
    if (runButton) {
      runButton.disabled = observedFrames.length === 0;
    }
    setStatus(
      observedFrames.length
        ? `${observedFrames.length} observed frame(s) ready for stability validation.`
        : "Run signal extraction first to populate observed frames.",
    );
  }

  async function runStabilityCheck() {
    const runId = activeRunId + 1;
    activeRunId = runId;

    if (!observedFrames.length) {
      updateFromObservedFrames([]);
      if (runButton) {
        runButton.disabled = false;
      }
      return;
    }

    if (runButton) {
      runButton.disabled = true;
    }

    setStatus("Validating signal stability across frames...");
    setProgress(0, observedFrames.length);

    try {
      const result = evaluateSignalStability(observedFrames, {
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
      setProgress(observedFrames.length, observedFrames.length);
      publishState(result);
      setStatus(
        `${result.stable_signals.length} stable signal(s) retained; ${result.discarded_signals.length} discarded as weak or unstable.`,
      );
    } catch (error) {
      if (runId !== activeRunId) {
        return;
      }

      const empty = { stable_signals: [], discarded_signals: [] };
      refreshSummary(empty);
      renderOutput(empty, output);
      setProgress(0, observedFrames.length);
      publishState(empty);
      setStatus(error instanceof Error ? error.message : "Signal stability validation failed.");
    } finally {
      if (runId === activeRunId && runButton) {
        runButton.disabled = false;
      }
      if (runId === activeRunId && resetButton) {
        resetButton.disabled = false;
      }
    }
  }

  function handleExtractionUpdate(event) {
    const detail = event?.detail || {};
    updateFromObservedFrames(detail.observedFrames || []);
  }

  function handleRunClick(event) {
    event.preventDefault();
    runStabilityCheck();
  }

  function handleResetClick(event) {
    event.preventDefault();
    activeRunId += 1;
    observedFrames = [];
    const empty = { stable_signals: [], discarded_signals: [] };
    refreshSummary(empty);
    renderOutput(empty, output);
    setProgress(0, 0);
    publishState(empty);
    if (runButton) {
      runButton.disabled = true;
    }
    setStatus("Run signal extraction first to populate observed frames.");
  }

  if (runButton) {
    runButton.addEventListener("click", handleRunClick);
  }
  if (resetButton) {
    resetButton.addEventListener("click", handleResetClick);
  }

  window.addEventListener("zee:signal-extraction-updated", handleExtractionUpdate);

  if (Array.isArray(window.__ZEE_SIGNAL_EXTRACTION_STATE__?.observedFrames)) {
    handleExtractionUpdate({ detail: window.__ZEE_SIGNAL_EXTRACTION_STATE__ });
  } else {
    handleExtractionUpdate({ detail: { observedFrames: [] } });
  }

  return () => {
    if (runButton) {
      runButton.removeEventListener("click", handleRunClick);
    }
    if (resetButton) {
      resetButton.removeEventListener("click", handleResetClick);
    }
    window.removeEventListener("zee:signal-extraction-updated", handleExtractionUpdate);
  };
}
