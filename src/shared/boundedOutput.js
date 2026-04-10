const DEFAULT_BOUNDED_OUTPUT_THRESHOLDS = Object.freeze({
  minInferenceSupport: 2,
});

function uniqueValues(values) {
  return [...new Set(values.filter((value) => value != null && value !== ""))];
}

function takeSample(values, limit = 4) {
  return Array.from(values || []).slice(0, limit);
}

function formatCountLabel(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function resolveEntryLabel(entry, index) {
  if (typeof entry === "string") {
    return entry;
  }

  if (typeof entry?.path === "string" && entry.path) {
    return entry.path;
  }

  if (typeof entry?.webkitRelativePath === "string" && entry.webkitRelativePath) {
    return entry.webkitRelativePath;
  }

  if (typeof entry?.relativePath === "string" && entry.relativePath) {
    return entry.relativePath;
  }

  if (typeof entry?.name === "string" && entry.name) {
    return entry.name;
  }

  return `item-${(index || 0) + 1}`;
}

function normalizeConfidenceMap(confidence) {
  const output = {};
  for (const [key, value] of Object.entries(confidence || {})) {
    output[key] = value;
  }
  return output;
}

function buildStateDigest(states) {
  const frameIsolation = states.frameIsolation || {};
  const signalExtraction = states.signalExtraction || {};
  const signalStability = states.signalStability || {};
  const signalMeasurement = states.signalMeasurement || {};
  const signalInference = states.signalInference || {};

  const observedFrames = Array.isArray(signalExtraction.observedFrames) ? signalExtraction.observedFrames : [];
  const stableSignals = Array.isArray(signalStability.stable_signals) ? signalStability.stable_signals : [];
  const measurements = Array.isArray(signalMeasurement.measurements) ? signalMeasurement.measurements : [];
  const inferred = Array.isArray(signalInference.inferred) ? signalInference.inferred : [];
  const rejectedInference = Array.isArray(signalInference.rejected) ? signalInference.rejected : [];
  const diagnostics = Array.isArray(frameIsolation.diagnostics) ? frameIsolation.diagnostics : [];
  const keptFiles = Array.isArray(frameIsolation.validFramePaths)
    ? frameIsolation.validFramePaths
    : Array.isArray(frameIsolation.keptFiles)
      ? frameIsolation.keptFiles.map((entry, index) => resolveEntryLabel(entry, index))
      : diagnostics.filter((entry) => entry?.kept).map((entry) => entry.path).filter((value) => value != null);
  const rejectedFiles = Array.isArray(frameIsolation.rejectedFiles)
    ? frameIsolation.rejectedFiles
    : diagnostics.filter((entry) => !entry?.kept).map((entry) => entry.path).filter((value) => value != null);

  return {
    frameIsolation,
    signalExtraction,
    signalStability,
    signalMeasurement,
    signalInference,
    observedFrames,
    stableSignals,
    measurements,
    inferred,
    rejectedInference,
    keptFiles,
    rejectedFiles,
    diagnostics,
    frameCount: observedFrames.length,
    featureCount: observedFrames.reduce(
      (total, frame) => total + (Array.isArray(frame?.observed_features) ? frame.observed_features.length : 0),
      0,
    ),
    measurementTypes: uniqueValues(measurements.map((measurement) => measurement.type)),
  };
}

function buildEvidenceLinksFromFrameIsolation(frameIsolation) {
  const diagnostics = Array.isArray(frameIsolation.diagnostics) ? frameIsolation.diagnostics : [];
  const keptFiles = Array.isArray(frameIsolation.validFramePaths)
    ? frameIsolation.validFramePaths
    : Array.isArray(frameIsolation.keptFiles)
      ? frameIsolation.keptFiles.map((entry, index) => resolveEntryLabel(entry, index))
      : diagnostics.filter((entry) => entry?.kept).map((entry) => entry.path).filter((value) => value != null);
  const rejectedFiles = Array.isArray(frameIsolation.rejectedFiles)
    ? frameIsolation.rejectedFiles
    : diagnostics.filter((entry) => !entry?.kept).map((entry) => entry.path).filter((value) => value != null);

  return [{
    source: "frame_isolation",
    kept_files: keptFiles.length,
    rejected_files: rejectedFiles.length,
    sample_kept_files: takeSample(keptFiles),
    sample_rejected_files: takeSample(rejectedFiles),
  }];
}

function buildEvidenceLinksFromObservedFrames(observedFrames) {
  return observedFrames.map((frame) => ({
    source: "signal_extraction",
    frame_id: frame.frame_id,
    feature_count: Array.isArray(frame.observed_features) ? frame.observed_features.length : 0,
    feature_types: uniqueValues((frame.observed_features || []).map((feature) => feature.type)),
  }));
}

function buildEvidenceLinksFromStableSignals(stableSignals) {
  return stableSignals.map((signal) => ({
    source: "signal_stability",
    signal_id: signal.signal_id,
    signal_type: signal.type,
    support_frames: signal.support_frames,
    frame_ids: signal.frame_ids || [],
    status: signal.status,
    reason: signal.reason,
  }));
}

function buildEvidenceLinksFromMeasurements(measurements) {
  return measurements.map((measurement) => ({
    source: "signal_measurement",
    signal_id: measurement.signal_id,
    measurement_type: measurement.type,
    signal_type: measurement.signal_type || null,
    frame_ids: measurement.frame_ids || [],
  }));
}

function confidenceFromBreadth({ signalCount = 0, frameCount = 0, layerCount = 0 }) {
  if (signalCount >= 2 && frameCount >= 2 && layerCount >= 2) {
    return "high";
  }

  if (signalCount >= 1 || frameCount >= 1 || layerCount >= 1) {
    return "medium";
  }

  return "low";
}

function buildSupportedTechnicalFindings(digest, confidence) {
  const supported = [];

  if (digest.keptFiles.length > 0) {
    supported.push({
      claim: "filtered frames retained for analysis",
      confidence: confidence.frame_isolation,
      evidence_links: buildEvidenceLinksFromFrameIsolation(digest.frameIsolation),
      reasoning_chain: [
        `frame isolation kept ${formatCountLabel(digest.keptFiles.length, "frame")}`,
        `frame isolation rejected ${formatCountLabel(digest.rejectedFiles.length, "frame")}`,
        "only technically valid frames moved forward",
      ],
    });
  }

  if (digest.frameCount > 0) {
    supported.push({
      claim: "observable signals extracted from visible frame structure",
      confidence: confidence.observed_signals,
      evidence_links: buildEvidenceLinksFromObservedFrames(digest.observedFrames),
      reasoning_chain: [
        `observed ${formatCountLabel(digest.frameCount, "frame")}`,
        `observed ${formatCountLabel(digest.featureCount, "feature")}`,
        "features remain traceable to pixels",
      ],
    });
  }

  if (digest.stableSignals.length > 0) {
    supported.push({
      claim: "stable signals recur across multiple frames",
      confidence: confidence.stable_signals,
      evidence_links: buildEvidenceLinksFromStableSignals(digest.stableSignals),
      reasoning_chain: [
        `retained ${formatCountLabel(digest.stableSignals.length, "stable signal")}`,
        "unstable and single-frame signals were removed",
      ],
    });
  }

  if (digest.measurements.length > 0) {
    supported.push({
      claim: "stable signals were quantified into bounded measurements",
      confidence: confidence.measurements,
      evidence_links: buildEvidenceLinksFromMeasurements(digest.measurements),
      reasoning_chain: [
        `quantified ${formatCountLabel(digest.measurements.length, "measurement")}`,
        `measurement types: ${digest.measurementTypes.join(", ") || "-"}`,
        "values remain numeric or categorical",
      ],
    });
  }

  for (const inference of digest.inferred) {
    supported.push({
      claim: inference.claim,
      support: Array.isArray(inference.support) ? inference.support : [],
      confidence: Array.isArray(inference.support) && inference.support.length >= DEFAULT_BOUNDED_OUTPUT_THRESHOLDS.minInferenceSupport ? "high" : "medium",
      evidence_links: inference.evidence_links || [],
      reasoning_chain: inference.reasoning_chain || [],
    });
  }

  return supported;
}

function buildRejectedTechnicalFindings(digest) {
  const rejected = [];

  if (digest.rejectedFiles.length > 0) {
    const reasons = uniqueValues(
      (digest.diagnostics || [])
        .filter((entry) => entry.decision === "discarded" || entry.kept === false)
        .flatMap((entry) => entry.reasons || []),
    );

    rejected.push({
      claim: "frame-quality rejected inputs",
      reason: "frames failed technical filtering",
      count: digest.rejectedFiles.length,
      evidence_links: buildEvidenceLinksFromFrameIsolation(digest.frameIsolation),
      reasoning_chain: [
        `discarded ${formatCountLabel(digest.rejectedFiles.length, "frame")}`,
        reasons.length ? `reasons: ${reasons.join("; ")}` : "rejected by technical frame gates",
      ],
    });
  }

  if (digest.signalStability.discarded_signals?.length > 0) {
    rejected.push({
      claim: "unstable signals removed",
      reason: "signals did not recur consistently across frames",
      count: digest.signalStability.discarded_signals.length,
      evidence_links: digest.signalStability.discarded_signals.map((signal) => ({
        signal_id: signal.signal_id,
        type: signal.type,
        reason: signal.reason,
        status: signal.status,
      })),
      reasoning_chain: [
        `discarded ${formatCountLabel(digest.signalStability.discarded_signals.length, "signal")}`,
        "single-frame or drifting signals were not retained",
      ],
    });
  }

  if (digest.signalMeasurement.discarded_measurements?.length > 0) {
    rejected.push({
      claim: "non-measurable stable signals removed",
      reason: "stable signals did not expose measurable pixel values",
      count: digest.signalMeasurement.discarded_measurements.length,
      evidence_links: digest.signalMeasurement.discarded_measurements.map((entry) => ({
        signal_id: entry.signal_id,
        signal_type: entry.signal_type,
        reason: entry.reason,
      })),
      reasoning_chain: [
        `discarded ${formatCountLabel(digest.signalMeasurement.discarded_measurements.length, "measurement candidate")}`,
        "no measurable numeric or categorical values were available",
      ],
    });
  }

  for (const inference of digest.rejectedInference) {
    rejected.push({
      claim: inference.claim,
      reason: inference.reason,
      evidence_links: inference.evidence_links || [],
      reasoning_chain: inference.reasoning_chain || [],
    });
  }

  return rejected;
}

function buildUnknownFindings(digest) {
  const unknown = [];

  unknown.push({
    claim: "absolute conclusion",
    reason: "not proven; the evidence only supports bounded claims",
  });

  if (!digest.inferred.length) {
    unknown.push({
      claim: "semantic identity",
      reason: "no multi-signal inference survived the gate",
    });
  }

  if (!digest.frameCount) {
    unknown.push({
      claim: "observed frame content",
      reason: "no observed frames are available for the current run",
    });
  }

  return unknown;
}

function buildConfidenceSummary(digest, supported) {
  const confidence = {
    frame_isolation: confidenceFromBreadth({
      signalCount: digest.keptFiles.length,
      frameCount: digest.keptFiles.length,
      layerCount: digest.rejectedFiles.length > 0 ? 2 : 1,
    }),
    observed_signals: confidenceFromBreadth({
      signalCount: digest.featureCount,
      frameCount: digest.frameCount,
      layerCount: digest.frameCount > 0 ? 2 : 0,
    }),
    stable_signals: confidenceFromBreadth({
      signalCount: digest.stableSignals.length,
      frameCount: uniqueValues(digest.stableSignals.flatMap((signal) => signal.frame_ids || [])).length,
      layerCount: digest.stableSignals.length > 0 ? 2 : 0,
    }),
    measurements: confidenceFromBreadth({
      signalCount: digest.measurements.length,
      frameCount: uniqueValues(digest.measurements.flatMap((measurement) => measurement.frame_ids || [])).length,
      layerCount: digest.measurements.length > 0 ? 2 : 0,
    }),
    inferred_claims: digest.inferred.length >= 2 ? "high" : digest.inferred.length === 1 ? "medium" : "low",
    absolute: "not proven",
  };

  for (const item of supported) {
    if (!item?.claim) {
      continue;
    }
    confidence[item.claim] = item.confidence || "low";
  }

  return normalizeConfidenceMap(confidence);
}

function sortByClaim(left, right) {
  return String(left.claim || "").localeCompare(String(right.claim || ""));
}

export function evaluateBoundedOutput(states = {}, options = {}) {
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  const digest = buildStateDigest(states);
  const supported = buildSupportedTechnicalFindings(digest, {
    frame_isolation: confidenceFromBreadth({
      signalCount: digest.keptFiles.length,
      frameCount: digest.keptFiles.length,
      layerCount: digest.rejectedFiles.length > 0 ? 2 : 1,
    }),
    observed_signals: confidenceFromBreadth({
      signalCount: digest.featureCount,
      frameCount: digest.frameCount,
      layerCount: digest.frameCount > 0 ? 2 : 0,
    }),
    stable_signals: confidenceFromBreadth({
      signalCount: digest.stableSignals.length,
      frameCount: uniqueValues(digest.stableSignals.flatMap((signal) => signal.frame_ids || [])).length,
      layerCount: digest.stableSignals.length > 0 ? 2 : 0,
    }),
    measurements: confidenceFromBreadth({
      signalCount: digest.measurements.length,
      frameCount: uniqueValues(digest.measurements.flatMap((measurement) => measurement.frame_ids || [])).length,
      layerCount: digest.measurements.length > 0 ? 2 : 0,
    }),
  });
  const rejected = buildRejectedTechnicalFindings(digest);
  const unknown = buildUnknownFindings(digest);
  const confidence = buildConfidenceSummary(digest, supported);

  const totalSteps = 5;
  let completed = 0;
  if (onProgress) {
    completed += 1;
    onProgress({ completed, total: totalSteps, current: { stage: "frame_isolation" } });
    completed += 1;
    onProgress({ completed, total: totalSteps, current: { stage: "signal_extraction" } });
    completed += 1;
    onProgress({ completed, total: totalSteps, current: { stage: "signal_stability" } });
    completed += 1;
    onProgress({ completed, total: totalSteps, current: { stage: "signal_measurement" } });
    completed += 1;
    onProgress({ completed, total: totalSteps, current: { stage: "signal_inference" } });
  }

  supported.sort(sortByClaim);
  rejected.sort(sortByClaim);
  unknown.sort(sortByClaim);

  return {
    supported,
    rejected,
    unknown,
    confidence,
    summary: {
      frame_isolation: {
        kept: digest.keptFiles.length,
        rejected: digest.rejectedFiles.length,
      },
      observed_frames: digest.frameCount,
      stable_signals: digest.stableSignals.length,
      measurements: digest.measurements.length,
      inferred: digest.inferred.length,
      rejected: rejected.length,
      unknown: unknown.length,
    },
  };
}

export { DEFAULT_BOUNDED_OUTPUT_THRESHOLDS };
