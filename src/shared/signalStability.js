const DEFAULT_SIGNAL_STABILITY_THRESHOLDS = Object.freeze({
  minOccurrences: 2,
  minFrameCoverage: 0.5,
  maxCenterDrift: 0.08,
  maxSizeDrift: 0.18,
  minIoU: 0.22,
});

function roundMetric(value, precision = 3) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function resolveLocation(feature) {
  const location = feature?.location;
  if (!location) {
    return null;
  }

  const x = Number(location.x) || 0;
  const y = Number(location.y) || 0;
  const width = Number(location.width) || 0;
  const height = Number(location.height) || 0;

  return { x, y, width, height };
}

function normalizeLocation(location, frameSize) {
  const width = Math.max(1, Number(frameSize?.width) || 1);
  const height = Math.max(1, Number(frameSize?.height) || 1);
  const x = location.x / width;
  const y = location.y / height;
  const w = location.width / width;
  const h = location.height / height;

  return {
    x,
    y,
    width: w,
    height: h,
    centerX: x + w / 2,
    centerY: y + h / 2,
  };
}

function distance2d(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function intersectionOverUnion(a, b) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  if (right <= left || bottom <= top) {
    return 0;
  }

  const intersection = (right - left) * (bottom - top);
  const union = (a.width * a.height) + (b.width * b.height) - intersection;
  return union > 0 ? intersection / union : 0;
}

function median(values) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function buildSignalKey(feature) {
  if (feature.type === "color") {
    return [
      feature.type || "",
      feature.role || "",
    ].join("|");
  }

  return [
    feature.type || "",
    feature.value || "",
    feature.role || "",
  ].join("|");
}

function mode(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  let winner = values[0] || "";
  let winnerCount = 0;
  for (const [value, count] of counts.entries()) {
    if (count > winnerCount) {
      winner = value;
      winnerCount = count;
    }
  }

  return winner;
}

function buildStableFingerprint(frame, feature, frameIndex) {
  const location = resolveLocation(feature);
  if (!location) {
    return null;
  }

  const normalized = normalizeLocation(location, frame.frame_size);
  return {
    frame_id: frame.frame_id,
    frame_index: frameIndex,
    type: feature.type || "unknown",
    value: feature.value || "",
    role: feature.role || "",
    location,
    normalized,
    evidence: feature.evidence || {},
    source: feature,
  };
}

function canJoinCluster(cluster, record, thresholds) {
  if (cluster.type !== record.type || cluster.value !== record.value || cluster.role !== record.role) {
    return false;
  }

  const last = cluster.records[cluster.records.length - 1];
  const centerDrift = distance2d(
    last.normalized.centerX,
    last.normalized.centerY,
    record.normalized.centerX,
    record.normalized.centerY,
  );
  const sizeDrift = Math.max(
    Math.abs(last.normalized.width - record.normalized.width),
    Math.abs(last.normalized.height - record.normalized.height),
  );
  const iou = intersectionOverUnion(last.normalized, record.normalized);

  return (
    centerDrift <= thresholds.maxCenterDrift &&
    sizeDrift <= thresholds.maxSizeDrift &&
    iou >= thresholds.minIoU
  );
}

function createCluster(record) {
  return {
    type: record.type,
    value: record.value,
    role: record.role,
    records: [record],
  };
}

function addRecordToCluster(cluster, record) {
  cluster.records.push(record);
}

function summarizeCluster(cluster, totalFrames, thresholds) {
  const frameIds = [];
  const seenFrames = new Set();
  const centerXs = [];
  const centerYs = [];
  const widths = [];
  const heights = [];
  const ious = [];

  for (let index = 0; index < cluster.records.length; index += 1) {
    const record = cluster.records[index];
    if (!seenFrames.has(record.frame_id)) {
      seenFrames.add(record.frame_id);
      frameIds.push(record.frame_id);
    }

    centerXs.push(record.normalized.centerX);
    centerYs.push(record.normalized.centerY);
    widths.push(record.normalized.width);
    heights.push(record.normalized.height);

    if (index > 0) {
      const prev = cluster.records[index - 1];
      ious.push(intersectionOverUnion(prev.normalized, record.normalized));
    }
  }

  const meanCenterX = median(centerXs);
  const meanCenterY = median(centerYs);
  const meanWidth = median(widths);
  const meanHeight = median(heights);
  const representative = cluster.records[0];
  const value = mode(cluster.records.map((record) => record.value || ""));
  const coverage = frameIds.length / Math.max(1, totalFrames);
  const maxCenterDrift = centerXs.reduce((max, centerX, index) => {
    const drift = distance2d(centerX, centerYs[index], meanCenterX, meanCenterY);
    return Math.max(max, drift);
  }, 0);
  const maxSizeDrift = widths.reduce((max, width, index) => {
    const widthDrift = Math.abs(width - meanWidth);
    const heightDrift = Math.abs(heights[index] - meanHeight);
    return Math.max(max, widthDrift, heightDrift);
  }, 0);
  const meanIoU = ious.length ? ious.reduce((sum, value) => sum + value, 0) / ious.length : 1;
  const location = {
    x: roundMetric(meanCenterX - meanWidth / 2, 4),
    y: roundMetric(meanCenterY - meanHeight / 2, 4),
    width: roundMetric(meanWidth, 4),
    height: roundMetric(meanHeight, 4),
  };

  const qualifiesStable =
    frameIds.length >= thresholds.minOccurrences &&
    coverage >= thresholds.minFrameCoverage &&
    maxCenterDrift <= thresholds.maxCenterDrift &&
    maxSizeDrift <= thresholds.maxSizeDrift &&
    meanIoU >= thresholds.minIoU;

  let status = "unstable";
  let reason = "signal shifts across frames";
  if (frameIds.length === 1) {
    status = "weak";
    reason = "single-frame signal";
  } else if (qualifiesStable) {
    status = "stable";
    reason = "appears consistently across multiple frames";
  }

  return {
    signal_id: `${representative.type}:${value}:${representative.role || "default"}:${frameIds.join(",")}`,
    type: representative.type,
    value,
    role: representative.role || null,
    status,
    reason,
    frame_ids: frameIds,
    occurrences: cluster.records.length,
    support_frames: frameIds.length,
    coverage: roundMetric(coverage, 3),
    location,
    spatial_consistency: {
      mean_iou: roundMetric(meanIoU, 3),
      max_center_drift: roundMetric(maxCenterDrift, 4),
      max_size_drift: roundMetric(maxSizeDrift, 4),
    },
    evidence: cluster.records.map((record) => ({
      frame_id: record.frame_id,
      location: record.location,
      normalized_location: {
        x: roundMetric(record.normalized.x, 4),
        y: roundMetric(record.normalized.y, 4),
        width: roundMetric(record.normalized.width, 4),
        height: roundMetric(record.normalized.height, 4),
      },
      evidence: record.evidence,
    })),
    source_feature: representative.source,
  };
}

function sortBySupportThenConsistency(left, right) {
  if (right.support_frames !== left.support_frames) {
    return right.support_frames - left.support_frames;
  }

  if (right.occurrences !== left.occurrences) {
    return right.occurrences - left.occurrences;
  }

  return left.signal_id.localeCompare(right.signal_id);
}

export function evaluateSignalStability(observedFrames, options = {}) {
  const thresholds = { ...DEFAULT_SIGNAL_STABILITY_THRESHOLDS, ...(options.thresholds || {}) };
  const frames = Array.from(observedFrames || []);
  const totalFrames = frames.length;
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  const clusters = [];

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
    const frame = frames[frameIndex];
    const features = Array.from(frame?.observed_features || []);

    for (const feature of features) {
      const record = buildStableFingerprint(frame, feature, frameIndex);
      if (!record) {
        continue;
      }

      const fingerprint = buildSignalKey(record);
      const candidateClusters = clusters.filter((cluster) => buildSignalKey(cluster) === fingerprint);
      let matched = false;

      for (const cluster of candidateClusters) {
        if (canJoinCluster(cluster, record, thresholds)) {
          addRecordToCluster(cluster, record);
          matched = true;
          break;
        }
      }

      if (!matched) {
        const cluster = createCluster(record);
        cluster.key = fingerprint;
        clusters.push(cluster);
      }
    }

    if (onProgress) {
      onProgress({
        completed: frameIndex + 1,
        total: totalFrames,
        current: frame,
      });
    }
  }

  const stable_signals = [];
  const discarded_signals = [];

  for (const cluster of clusters) {
    const summary = summarizeCluster(cluster, totalFrames, thresholds);
    if (summary.status === "stable") {
      stable_signals.push(summary);
    } else {
      discarded_signals.push(summary);
    }
  }

  stable_signals.sort(sortBySupportThenConsistency);
  discarded_signals.sort(sortBySupportThenConsistency);

  return {
    stable_signals,
    discarded_signals,
  };
}

export { DEFAULT_SIGNAL_STABILITY_THRESHOLDS };
