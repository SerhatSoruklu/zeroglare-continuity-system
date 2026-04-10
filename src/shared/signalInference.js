const DEFAULT_SIGNAL_INFERENCE_THRESHOLDS = Object.freeze({
  minIndependentSignals: 2,
  minDistinctFrames: 2,
  maxColorDistance: 48,
  maxSpacingSpread: 0.18,
  maxPatternSpread: 0.08,
});

function roundMetric(value, precision = 3) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function uniqueValues(values) {
  return [...new Set(values.filter((value) => value != null && value !== ""))];
}

function uniqueFrameIds(measurements) {
  return uniqueValues(measurements.flatMap((measurement) => measurement.frame_ids || []));
}

function uniqueSignalIds(measurements) {
  return uniqueValues(measurements.map((measurement) => measurement.signal_id));
}

function getReasoningBase(measurements) {
  return [
    `collected ${measurements.length} stable measurement(s)`,
    `found ${uniqueSignalIds(measurements).length} independent signal(s)`,
    `found ${uniqueFrameIds(measurements).length} distinct frame(s)`,
  ];
}

function formatSupportLinks(measurements) {
  return measurements.map((measurement) => ({
    signal_id: measurement.signal_id,
    measurement_type: measurement.type,
    signal_type: measurement.signal_type || null,
    frame_ids: measurement.frame_ids || [],
  }));
}

function rgbDistance(left, right) {
  const dr = (Number(left?.[0]) || 0) - (Number(right?.[0]) || 0);
  const dg = (Number(left?.[1]) || 0) - (Number(right?.[1]) || 0);
  const db = (Number(left?.[2]) || 0) - (Number(right?.[2]) || 0);
  return Math.hypot(dr, dg, db);
}

function inferMultiSignalCoherence(measurements, thresholds) {
  const support = uniqueSignalIds(measurements);
  const frameIds = uniqueFrameIds(measurements);
  const types = uniqueValues(measurements.map((measurement) => measurement.type));
  const reasoning_chain = [
    ...getReasoningBase(measurements),
    `measurement types observed: ${types.join(", ") || "-"}`,
    `independent signal requirement: >= ${thresholds.minIndependentSignals}`,
    `distinct frame requirement: >= ${thresholds.minDistinctFrames}`,
  ];

  if (support.length < thresholds.minIndependentSignals) {
    return {
      claim: "multi-signal structure is present",
      support: [],
      reason: "insufficient independent signals",
      reasoning_chain: [...reasoning_chain, "rejected: insufficient independent signals"],
      evidence_links: formatSupportLinks(measurements),
      status: "rejected",
    };
  }

  if (frameIds.length < thresholds.minDistinctFrames) {
    return {
      claim: "multi-signal structure is present",
      support: [],
      reason: "signals do not recur across multiple frames",
      reasoning_chain: [...reasoning_chain, "rejected: insufficient frame recurrence"],
      evidence_links: formatSupportLinks(measurements),
      status: "rejected",
    };
  }

  if (types.length < 2) {
    return {
      claim: "multi-signal structure is present",
      support: [],
      reason: "insufficient signal-type diversity",
      reasoning_chain: [...reasoning_chain, "rejected: insufficient signal-type diversity"],
      evidence_links: formatSupportLinks(measurements),
      status: "rejected",
    };
  }

  return {
    claim: "multi-signal structure is present",
    support,
    reason: "supported by multiple independent measurements across frames",
    reasoning_chain: [...reasoning_chain, "passed: bounded multi-signal support"],
    evidence_links: formatSupportLinks(measurements),
    status: "inferred",
  };
}

function inferColorConsistency(measurements, thresholds) {
  const colors = measurements.filter((measurement) => measurement.type === "color");
  const support = uniqueSignalIds(colors);
  const frameIds = uniqueFrameIds(colors);
  const reasoning_chain = [
    ...getReasoningBase(colors),
    `color measurement count: ${colors.length}`,
    `max RGB distance threshold: ${thresholds.maxColorDistance}`,
  ];

  if (colors.length < thresholds.minIndependentSignals) {
    return {
      claim: "consistent color distribution",
      support: [],
      reason: "insufficient color measurements",
      reasoning_chain: [...reasoning_chain, "rejected: fewer than 2 color signals"],
      evidence_links: formatSupportLinks(colors),
      status: "rejected",
    };
  }

  if (support.length < thresholds.minIndependentSignals) {
    return {
      claim: "consistent color distribution",
      support: [],
      reason: "insufficient independent color signals",
      reasoning_chain: [...reasoning_chain, "rejected: insufficient independent color signals"],
      evidence_links: formatSupportLinks(colors),
      status: "rejected",
    };
  }

  if (frameIds.length < thresholds.minDistinctFrames) {
    return {
      claim: "consistent color distribution",
      support: [],
      reason: "color signals do not recur across multiple frames",
      reasoning_chain: [...reasoning_chain, "rejected: insufficient frame recurrence"],
      evidence_links: formatSupportLinks(colors),
      status: "rejected",
    };
  }

  const means = colors.map((measurement) => measurement.rgb_mean || [0, 0, 0]);
  let maxDistance = 0;
  for (let i = 0; i < means.length; i += 1) {
    for (let j = i + 1; j < means.length; j += 1) {
      maxDistance = Math.max(maxDistance, rgbDistance(means[i], means[j]));
    }
  }

  if (maxDistance > thresholds.maxColorDistance) {
    return {
      claim: "consistent color distribution",
      support: [],
      reason: "color values drift beyond bounded tolerance",
      reasoning_chain: [
        ...reasoning_chain,
        `rejected: max RGB distance ${roundMetric(maxDistance, 2)} exceeds threshold`,
      ],
      evidence_links: formatSupportLinks(colors),
      status: "rejected",
    };
  }

  return {
    claim: "consistent color distribution",
    support,
    reason: "color measurements remain bounded across multiple frames",
    reasoning_chain: [
      ...reasoning_chain,
      `passed: max RGB distance ${roundMetric(maxDistance, 2)} within threshold`,
    ],
    evidence_links: formatSupportLinks(colors),
    status: "inferred",
  };
}

function inferSpacingConsistency(measurements, thresholds) {
  const spacing = measurements.filter((measurement) => measurement.type === "spacing");
  const support = uniqueSignalIds(spacing);
  const frameIds = uniqueFrameIds(spacing);
  const values = spacing.map((measurement) => Number(measurement.metrics?.spacing_ratio));
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;
  const spread = maxValue - minValue;
  const reasoning_chain = [
    ...getReasoningBase(spacing),
    `spacing measurement count: ${spacing.length}`,
    `spacing spread threshold: ${thresholds.maxSpacingSpread}`,
  ];

  if (spacing.length < thresholds.minIndependentSignals) {
    return {
      claim: "consistent geometric spacing",
      support: [],
      reason: "insufficient spacing measurements",
      reasoning_chain: [...reasoning_chain, "rejected: fewer than 2 spacing measurements"],
      evidence_links: formatSupportLinks(spacing),
      status: "rejected",
    };
  }

  if (support.length < thresholds.minIndependentSignals) {
    return {
      claim: "consistent geometric spacing",
      support: [],
      reason: "insufficient independent spacing signals",
      reasoning_chain: [...reasoning_chain, "rejected: insufficient independent signals"],
      evidence_links: formatSupportLinks(spacing),
      status: "rejected",
    };
  }

  if (frameIds.length < thresholds.minDistinctFrames) {
    return {
      claim: "consistent geometric spacing",
      support: [],
      reason: "spacing does not recur across multiple frames",
      reasoning_chain: [...reasoning_chain, "rejected: insufficient frame recurrence"],
      evidence_links: formatSupportLinks(spacing),
      status: "rejected",
    };
  }

  if (spread > thresholds.maxSpacingSpread) {
    return {
      claim: "consistent geometric spacing",
      support: [],
      reason: "spacing spread exceeds bounded tolerance",
      reasoning_chain: [
        ...reasoning_chain,
        `rejected: spread ${roundMetric(spread, 3)} exceeds threshold`,
      ],
      evidence_links: formatSupportLinks(spacing),
      status: "rejected",
    };
  }

  return {
    claim: "consistent geometric spacing",
    support,
    reason: "spacing remains bounded across multiple frames",
    reasoning_chain: [
      ...reasoning_chain,
      `passed: spread ${roundMetric(spread, 3)} within threshold`,
    ],
    evidence_links: formatSupportLinks(spacing),
    status: "inferred",
  };
}

function inferPatternConsistency(measurements, thresholds) {
  const patterns = measurements.filter((measurement) => measurement.type === "pattern_density");
  const support = uniqueSignalIds(patterns);
  const frameIds = uniqueFrameIds(patterns);
  const values = patterns.map((measurement) => Number(measurement.value));
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;
  const spread = maxValue - minValue;
  const reasoning_chain = [
    ...getReasoningBase(patterns),
    `pattern density measurement count: ${patterns.length}`,
    `pattern spread threshold: ${thresholds.maxPatternSpread}`,
  ];

  if (patterns.length < thresholds.minIndependentSignals) {
    return {
      claim: "consistent pattern density",
      support: [],
      reason: "insufficient pattern measurements",
      reasoning_chain: [...reasoning_chain, "rejected: fewer than 2 pattern measurements"],
      evidence_links: formatSupportLinks(patterns),
      status: "rejected",
    };
  }

  if (support.length < thresholds.minIndependentSignals) {
    return {
      claim: "consistent pattern density",
      support: [],
      reason: "insufficient independent pattern signals",
      reasoning_chain: [...reasoning_chain, "rejected: insufficient independent signals"],
      evidence_links: formatSupportLinks(patterns),
      status: "rejected",
    };
  }

  if (frameIds.length < thresholds.minDistinctFrames) {
    return {
      claim: "consistent pattern density",
      support: [],
      reason: "pattern density does not recur across multiple frames",
      reasoning_chain: [...reasoning_chain, "rejected: insufficient frame recurrence"],
      evidence_links: formatSupportLinks(patterns),
      status: "rejected",
    };
  }

  if (spread > thresholds.maxPatternSpread) {
    return {
      claim: "consistent pattern density",
      support: [],
      reason: "pattern density spread exceeds bounded tolerance",
      reasoning_chain: [
        ...reasoning_chain,
        `rejected: spread ${roundMetric(spread, 3)} exceeds threshold`,
      ],
      evidence_links: formatSupportLinks(patterns),
      status: "rejected",
    };
  }

  return {
    claim: "consistent pattern density",
    support,
    reason: "pattern density remains bounded across multiple frames",
    reasoning_chain: [
      ...reasoning_chain,
      `passed: spread ${roundMetric(spread, 3)} within threshold`,
    ],
    evidence_links: formatSupportLinks(patterns),
    status: "inferred",
  };
}

function sortBySupport(left, right) {
  const leftSupport = left.support.length;
  const rightSupport = right.support.length;

  if (rightSupport !== leftSupport) {
    return rightSupport - leftSupport;
  }

  return left.claim.localeCompare(right.claim);
}

export function evaluateSignalInference(measurements, options = {}) {
  const thresholds = { ...DEFAULT_SIGNAL_INFERENCE_THRESHOLDS, ...(options.thresholds || {}) };
  const allMeasurements = Array.from(measurements || []);
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  const inferred = [];
  const rejected = [];
  const candidates = [
    inferMultiSignalCoherence(allMeasurements, thresholds),
    inferColorConsistency(allMeasurements, thresholds),
    inferSpacingConsistency(allMeasurements, thresholds),
    inferPatternConsistency(allMeasurements, thresholds),
  ];

  candidates.forEach((candidate, index) => {
    if (candidate.status === "inferred") {
      inferred.push(candidate);
    } else {
      rejected.push(candidate);
    }
    if (onProgress) {
      onProgress({
        completed: index + 1,
        total: candidates.length,
        current: candidate,
      });
    }
  });

  inferred.sort(sortBySupport);
  rejected.sort(sortBySupport);

  return {
    inferred,
    rejected,
  };
}

export { DEFAULT_SIGNAL_INFERENCE_THRESHOLDS };
