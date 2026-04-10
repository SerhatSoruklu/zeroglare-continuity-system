export const SELECTORS = {
  pendulumButton: ".pendulum-button",
  pendulumCore: ".pendulum-core",
  root: "#root",
  workspace: "#workspace",
  frameFolderInput: "#frame-folder-input",
  frameRunButton: "#frame-run-button",
  frameResetButton: "#frame-reset-button",
  frameFolderLabel: "#frame-folder-label",
  frameStatus: "#frame-status",
  frameSummaryKept: "#frame-summary-kept",
  frameSummaryRejected: "#frame-summary-rejected",
  frameSummaryTotal: "#frame-summary-total",
  frameValidPaths: "#frame-valid-paths",
  frameDiagnostics: "#frame-diagnostics",
  frameProgressFill: "#frame-progress-fill",
  signalRunButton: "#signal-run-button",
  signalResetButton: "#signal-reset-button",
  signalStatus: "#signal-status",
  signalSummaryFrames: "#signal-summary-frames",
  signalSummaryFeatures: "#signal-summary-features",
  signalSummaryTypes: "#signal-summary-types",
  signalOutput: "#signal-output",
  signalProgressFill: "#signal-progress-fill",
  stabilityRunButton: "#stability-run-button",
  stabilityResetButton: "#stability-reset-button",
  stabilityStatus: "#stability-status",
  stabilityStableCount: "#stability-stable-count",
  stabilityDiscardedCount: "#stability-discarded-count",
  stabilityTotalCount: "#stability-total-count",
  stabilityOutput: "#stability-output",
  stabilityProgressFill: "#stability-progress-fill",
  measurementRunButton: "#measurement-run-button",
  measurementResetButton: "#measurement-reset-button",
  measurementStatus: "#measurement-status",
  measurementCount: "#measurement-count",
  measurementDiscardedCount: "#measurement-discarded-count",
  measurementTotalCount: "#measurement-total-count",
  measurementOutput: "#measurement-output",
  measurementProgressFill: "#measurement-progress-fill",
  inferenceRunButton: "#inference-run-button",
  inferenceResetButton: "#inference-reset-button",
  inferenceStatus: "#inference-status",
  inferenceInferredCount: "#inference-inferred-count",
  inferenceRejectedCount: "#inference-rejected-count",
  inferenceTotalCount: "#inference-total-count",
  inferenceOutput: "#inference-output",
  inferenceProgressFill: "#inference-progress-fill",
  finalRunButton: "#final-run-button",
  finalResetButton: "#final-reset-button",
  finalStatus: "#final-status",
  finalSupportedCount: "#final-supported-count",
  finalRejectedCount: "#final-rejected-count",
  finalUnknownCount: "#final-unknown-count",
  finalTotalCount: "#final-total-count",
  finalOutput: "#final-output",
  finalProgressFill: "#final-progress-fill",
  scaleInput: "#scale-input",
  scaleResultName: "#scale-result-name",
  scaleResultDetail: "#scale-result-detail",
  scaleResultSource: "#scale-result-source",
  scaleResultSourceDetail: "#scale-result-source-detail",
  scaleSanityList: "#scale-sanity-list",
};

export function getPendulumActivationElements(doc = document) {
  return {
    button: doc.querySelector(SELECTORS.pendulumButton),
    core: doc.querySelector(SELECTORS.pendulumCore),
    root: doc.querySelector(SELECTORS.root),
    workspace: doc.querySelector(SELECTORS.workspace),
  };
}

export function getScaleNamingElements(doc = document) {
  return {
    input: doc.querySelector(SELECTORS.scaleInput),
    resultName: doc.querySelector(SELECTORS.scaleResultName),
    resultDetail: doc.querySelector(SELECTORS.scaleResultDetail),
    resultSource: doc.querySelector(SELECTORS.scaleResultSource),
    resultSourceDetail: doc.querySelector(SELECTORS.scaleResultSourceDetail),
    sanityList: doc.querySelector(SELECTORS.scaleSanityList),
  };
}

export function getFrameIsolationElements(doc = document) {
  return {
    folderInput: doc.querySelector(SELECTORS.frameFolderInput),
    runButton: doc.querySelector(SELECTORS.frameRunButton),
    resetButton: doc.querySelector(SELECTORS.frameResetButton),
    folderLabel: doc.querySelector(SELECTORS.frameFolderLabel),
    status: doc.querySelector(SELECTORS.frameStatus),
    summaryKept: doc.querySelector(SELECTORS.frameSummaryKept),
    summaryRejected: doc.querySelector(SELECTORS.frameSummaryRejected),
    summaryTotal: doc.querySelector(SELECTORS.frameSummaryTotal),
    validPaths: doc.querySelector(SELECTORS.frameValidPaths),
    diagnostics: doc.querySelector(SELECTORS.frameDiagnostics),
    progressFill: doc.querySelector(SELECTORS.frameProgressFill),
  };
}

export function getSignalExtractionElements(doc = document) {
  return {
    runButton: doc.querySelector(SELECTORS.signalRunButton),
    resetButton: doc.querySelector(SELECTORS.signalResetButton),
    status: doc.querySelector(SELECTORS.signalStatus),
    summaryFrames: doc.querySelector(SELECTORS.signalSummaryFrames),
    summaryFeatures: doc.querySelector(SELECTORS.signalSummaryFeatures),
    summaryTypes: doc.querySelector(SELECTORS.signalSummaryTypes),
    output: doc.querySelector(SELECTORS.signalOutput),
    progressFill: doc.querySelector(SELECTORS.signalProgressFill),
  };
}

export function getSignalStabilityElements(doc = document) {
  return {
    runButton: doc.querySelector(SELECTORS.stabilityRunButton),
    resetButton: doc.querySelector(SELECTORS.stabilityResetButton),
    status: doc.querySelector(SELECTORS.stabilityStatus),
    stableCount: doc.querySelector(SELECTORS.stabilityStableCount),
    discardedCount: doc.querySelector(SELECTORS.stabilityDiscardedCount),
    totalCount: doc.querySelector(SELECTORS.stabilityTotalCount),
    output: doc.querySelector(SELECTORS.stabilityOutput),
    progressFill: doc.querySelector(SELECTORS.stabilityProgressFill),
  };
}

export function getSignalMeasurementElements(doc = document) {
  return {
    runButton: doc.querySelector(SELECTORS.measurementRunButton),
    resetButton: doc.querySelector(SELECTORS.measurementResetButton),
    status: doc.querySelector(SELECTORS.measurementStatus),
    measurementCount: doc.querySelector(SELECTORS.measurementCount),
    discardedCount: doc.querySelector(SELECTORS.measurementDiscardedCount),
    totalCount: doc.querySelector(SELECTORS.measurementTotalCount),
    output: doc.querySelector(SELECTORS.measurementOutput),
    progressFill: doc.querySelector(SELECTORS.measurementProgressFill),
  };
}

export function getSignalInferenceElements(doc = document) {
  return {
    runButton: doc.querySelector(SELECTORS.inferenceRunButton),
    resetButton: doc.querySelector(SELECTORS.inferenceResetButton),
    status: doc.querySelector(SELECTORS.inferenceStatus),
    inferredCount: doc.querySelector(SELECTORS.inferenceInferredCount),
    rejectedCount: doc.querySelector(SELECTORS.inferenceRejectedCount),
    totalCount: doc.querySelector(SELECTORS.inferenceTotalCount),
    output: doc.querySelector(SELECTORS.inferenceOutput),
    progressFill: doc.querySelector(SELECTORS.inferenceProgressFill),
  };
}

export function getBoundedOutputElements(doc = document) {
  return {
    runButton: doc.querySelector(SELECTORS.finalRunButton),
    resetButton: doc.querySelector(SELECTORS.finalResetButton),
    status: doc.querySelector(SELECTORS.finalStatus),
    supportedCount: doc.querySelector(SELECTORS.finalSupportedCount),
    rejectedCount: doc.querySelector(SELECTORS.finalRejectedCount),
    unknownCount: doc.querySelector(SELECTORS.finalUnknownCount),
    totalCount: doc.querySelector(SELECTORS.finalTotalCount),
    output: doc.querySelector(SELECTORS.finalOutput),
    progressFill: doc.querySelector(SELECTORS.finalProgressFill),
  };
}
