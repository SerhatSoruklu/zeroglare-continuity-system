import { extractObservedSignals } from "../shared/signalExtraction.js";
import { getSignalExtractionElements } from "../dom/selectors.js";

function renderSignalOutput(results, outputNode) {
  if (!outputNode) {
    return;
  }

  outputNode.value = JSON.stringify(results, null, 2);
}

function publishState(results) {
  const detail = {
    observedFrames: results || [],
  };

  window.__ZEE_SIGNAL_EXTRACTION_STATE__ = detail;
  window.dispatchEvent(
    new CustomEvent("zee:signal-extraction-updated", {
      detail,
    }),
  );
}

function summarizeFeatures(results) {
  let frameCount = 0;
  let featureCount = 0;
  const types = new Map();

  for (const frame of results) {
    frameCount += 1;
    for (const feature of frame.observed_features || []) {
      featureCount += 1;
      types.set(feature.type, (types.get(feature.type) || 0) + 1);
    }
  }

  return { frameCount, featureCount, types };
}

export function bindSignalExtractionLayer(doc = globalThis.document) {
  const {
    runButton,
    resetButton,
    status,
    summaryFrames,
    summaryFeatures,
    summaryTypes,
    output,
    progressFill,
  } = getSignalExtractionElements(doc);

  if (!runButton && !resetButton && !status && !summaryFrames && !summaryFeatures && !summaryTypes && !output && !progressFill) {
    return () => {};
  }

  let keptFiles = [];
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

  function refreshSummary(results = []) {
    const { frameCount, featureCount, types } = summarizeFeatures(results);

    if (summaryFrames) {
      summaryFrames.textContent = String(frameCount);
    }

    if (summaryFeatures) {
      summaryFeatures.textContent = String(featureCount);
    }

    if (summaryTypes) {
      summaryTypes.textContent = Array.from(types.keys()).join(", ") || "-";
    }
  }

  async function runExtraction() {
    const runId = activeRunId + 1;
    activeRunId = runId;

    if (!keptFiles.length) {
      refreshSummary([]);
      renderSignalOutput([], output);
      setProgress(0, 0);
      setStatus("Run frame isolation first to populate the filtered frame list.");
      if (runButton) {
        runButton.disabled = false;
      }
      return;
    }

    if (runButton) {
      runButton.disabled = true;
    }

    setStatus("Extracting observed signals from filtered frames...");
    setProgress(0, keptFiles.length);

    try {
      const results = await extractObservedSignals(
        keptFiles,
        {
          onProgress: ({ completed, total }) => {
            if (runId === activeRunId) {
              setProgress(completed, total);
            }
          },
        },
        doc,
      );

      if (runId !== activeRunId) {
        return;
      }

      refreshSummary(results);
      renderSignalOutput(results, output);
      setProgress(keptFiles.length, keptFiles.length);
      publishState(results);
      setStatus(`Observed signals extracted from ${results.length} filtered frames.`);
    } catch (error) {
      if (runId !== activeRunId) {
        return;
      }

      refreshSummary([]);
      renderSignalOutput([], output);
      setProgress(0, keptFiles.length);
      publishState([]);
      setStatus(error instanceof Error ? error.message : "Signal extraction failed.");
    } finally {
      if (runId === activeRunId && runButton) {
        runButton.disabled = false;
      }
      if (runId === activeRunId && resetButton) {
        resetButton.disabled = false;
      }
    }
  }

  function handleStateUpdate(event) {
    const detail = event?.detail || {};
    keptFiles = Array.from(detail.keptFiles || []);
    refreshSummary([]);
    renderSignalOutput([], output);
    setProgress(0, keptFiles.length);
    publishState([]);
    if (runButton) {
      runButton.disabled = keptFiles.length === 0;
    }
    setStatus(
      keptFiles.length
        ? `${keptFiles.length} filtered frame(s) ready for observed-signal extraction.`
        : "Run frame isolation first to populate the filtered frame list.",
    );
  }

  function handleRunClick(event) {
    event.preventDefault();
    runExtraction();
  }

  function handleResetClick(event) {
    event.preventDefault();
    activeRunId += 1;
    keptFiles = [];
    refreshSummary([]);
    renderSignalOutput([], output);
    setProgress(0, 0);
    publishState([]);
    if (runButton) {
      runButton.disabled = true;
    }
    setStatus("Run frame isolation first to populate the filtered frame list.");
  }

  if (runButton) {
    runButton.addEventListener("click", handleRunClick);
  }
  if (resetButton) {
    resetButton.addEventListener("click", handleResetClick);
  }

  window.addEventListener("zee:frame-isolation-updated", handleStateUpdate);

  if (Array.isArray(window.__ZEE_FRAME_ISOLATION_STATE__?.keptFiles)) {
    handleStateUpdate({ detail: window.__ZEE_FRAME_ISOLATION_STATE__ });
  } else {
    handleStateUpdate({ detail: { keptFiles: [] } });
  }

  return () => {
    if (runButton) {
      runButton.removeEventListener("click", handleRunClick);
    }
    if (resetButton) {
      resetButton.removeEventListener("click", handleResetClick);
    }
    window.removeEventListener("zee:frame-isolation-updated", handleStateUpdate);
  };
}
