import { analyzeFrameIsolation } from "../shared/frameIsolation.js";
import { getFrameIsolationElements } from "../dom/selectors.js";

function formatFrameSummary(result) {
  const kept = result.validFramePaths.length;
  const total = result.diagnostics.length;
  const rejected = total - kept;
  return { kept, total, rejected };
}

function renderDiagnostics(result, diagNode, pathsNode) {
  if (pathsNode) {
    pathsNode.value = result.validFramePaths.join("\n");
  }

  if (diagNode) {
    diagNode.value = JSON.stringify(result.diagnostics, null, 2);
  }
}

export function bindFrameIsolationLayer(doc = globalThis.document) {
  const {
    folderInput,
    runButton,
    resetButton,
    folderLabel,
    status,
    summaryKept,
    summaryRejected,
    summaryTotal,
    validPaths,
    diagnostics,
    progressFill,
  } = getFrameIsolationElements(doc);

  if (
    !folderInput &&
    !runButton &&
    !resetButton &&
    !folderLabel &&
    !status &&
    !summaryKept &&
    !summaryRejected &&
    !summaryTotal &&
    !validPaths &&
    !diagnostics &&
    !progressFill
  ) {
    return () => {};
  }

  let selectedFiles = [];
  let activeRunId = 0;

  function publishState(result, keptFiles) {
    const detail = {
      validFramePaths: result.validFramePaths || [],
      diagnostics: result.diagnostics || [],
      keptFiles: keptFiles || [],
    };

    window.__ZEE_FRAME_ISOLATION_STATE__ = detail;
    window.dispatchEvent(
      new CustomEvent("zee:frame-isolation-updated", {
        detail,
      }),
    );
  }

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

  function refreshFolderLabel() {
    if (!folderLabel) {
      return;
    }

    if (!selectedFiles.length) {
      folderLabel.textContent = "No folder selected.";
      return;
    }

    const firstPath = selectedFiles[0].webkitRelativePath || selectedFiles[0].name || "selected folder";
    const folderPath = firstPath.includes("/") ? firstPath.slice(0, firstPath.lastIndexOf("/")) : "selected folder";
    folderLabel.textContent = `${selectedFiles.length} frame files from ${folderPath}`;
  }

  function refreshSummary(result) {
    const { kept, rejected, total } = formatFrameSummary(result);

    if (summaryKept) {
      summaryKept.textContent = String(kept);
    }

    if (summaryRejected) {
      summaryRejected.textContent = String(rejected);
    }

    if (summaryTotal) {
      summaryTotal.textContent = String(total);
    }
  }

  async function runAnalysis() {
    const runId = activeRunId + 1;
    activeRunId = runId;

    if (!selectedFiles.length) {
      setStatus("Choose a folder of extracted frames to begin.");
      refreshSummary({ validFramePaths: [], diagnostics: [] });
      renderDiagnostics({ validFramePaths: [], diagnostics: [] }, diagnostics, validPaths);
      setProgress(0, 0);
      publishState({ validFramePaths: [], diagnostics: [] }, []);
      if (runButton) {
        runButton.disabled = false;
      }
      if (resetButton) {
        resetButton.disabled = false;
      }
      return;
    }

    if (runButton) {
      runButton.disabled = true;
    }

    setStatus("Analyzing frame quality deterministically...");
    setProgress(0, selectedFiles.length);

    try {
      const result = await analyzeFrameIsolation(
        selectedFiles,
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

      refreshSummary(result);
      renderDiagnostics(result, diagnostics, validPaths);
      setProgress(selectedFiles.length, selectedFiles.length);
      publishState(
        result,
        selectedFiles.filter((_, index) => result.diagnostics[index]?.kept),
      );

      const { kept, total } = formatFrameSummary(result);
      setStatus(`${kept} of ${total} frames kept after blur, brightness, contrast, and window-structure checks.`);
    } catch (error) {
      if (runId !== activeRunId) {
        return;
      }

      refreshSummary({ validFramePaths: [], diagnostics: [] });
      renderDiagnostics({ validFramePaths: [], diagnostics: [] }, diagnostics, validPaths);
      setProgress(0, selectedFiles.length);
      publishState({ validFramePaths: [], diagnostics: [] }, []);
      setStatus(error instanceof Error ? error.message : "Frame isolation analysis failed.");
    } finally {
      if (runId === activeRunId && runButton) {
        runButton.disabled = false;
      }
      if (runId === activeRunId && resetButton) {
        resetButton.disabled = false;
      }
    }
  }

  function handleFolderChange() {
    selectedFiles = Array.from(folderInput?.files || []).sort((left, right) => {
      const leftPath = left.webkitRelativePath || left.name || "";
      const rightPath = right.webkitRelativePath || right.name || "";
      return leftPath.localeCompare(rightPath, undefined, { numeric: true, sensitivity: "base" });
    });

    refreshFolderLabel();
    runAnalysis();
  }

  function handleRunClick(event) {
    event.preventDefault();
    runAnalysis();
  }

  function handleResetClick(event) {
    event.preventDefault();
    selectedFiles = [];
    activeRunId += 1;

    if (folderInput) {
      folderInput.value = "";
    }
    if (validPaths) {
      validPaths.value = "";
    }
    if (diagnostics) {
      diagnostics.value = "";
    }
    if (summaryKept) {
      summaryKept.textContent = "0";
    }
    if (summaryRejected) {
      summaryRejected.textContent = "0";
    }
    if (summaryTotal) {
      summaryTotal.textContent = "0";
    }
    if (runButton) {
      runButton.disabled = false;
    }
    if (resetButton) {
      resetButton.disabled = false;
    }

    setProgress(0, 0);
    refreshFolderLabel();
    setStatus("Choose a folder of extracted frames to begin.");
    publishState({ validFramePaths: [], diagnostics: [] }, []);
  }

  if (folderInput) {
    folderInput.addEventListener("change", handleFolderChange);
  }

  if (runButton) {
    runButton.addEventListener("click", handleRunClick);
  }

  if (resetButton) {
    resetButton.addEventListener("click", handleResetClick);
  }

  refreshFolderLabel();
  setStatus("Choose a folder of extracted frames to begin.");
  setProgress(0, 0);

  return () => {
    if (folderInput) {
      folderInput.removeEventListener("change", handleFolderChange);
    }
    if (runButton) {
      runButton.removeEventListener("click", handleRunClick);
    }
    if (resetButton) {
      resetButton.removeEventListener("click", handleResetClick);
    }
  };
}
