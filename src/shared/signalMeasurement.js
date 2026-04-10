const DEFAULT_SIGNAL_MEASUREMENT_THRESHOLDS = Object.freeze({
  maxSpacingNormalization: 4,
});

function roundMetric(value, precision = 3) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function hexToRgb(hex) {
  if (typeof hex !== "string") {
    return null;
  }

  const cleaned = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return null;
  }

  const value = Number.parseInt(cleaned, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHsv(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === rn) {
      hue = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      hue = (bn - rn) / delta + 2;
    } else {
      hue = (rn - gn) / delta + 4;
    }
    hue *= 60;
  }

  if (hue < 0) {
    hue += 360;
  }

  const saturation = max === 0 ? 0 : delta / max;
  const value = max;

  return {
    h: hue,
    s: saturation,
    v: value,
  };
}

function range(values) {
  if (!values.length) {
    return [0, 0];
  }

  let min = values[0];
  let max = values[0];
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return [min, max];
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total / values.length;
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

function buildMeasurementKey(signal) {
  return [signal.type || "", signal.value || "", signal.role || ""].join("|");
}

function collectColorSamples(signal) {
  const samples = [];

  for (const entry of signal.evidence || []) {
    const rgb = hexToRgb(entry?.evidence?.hex);
    if (rgb) {
      samples.push(rgb);
    }
  }

  if (!samples.length) {
    const fallback = hexToRgb(signal.source_feature?.evidence?.hex);
    if (fallback) {
      samples.push(fallback);
    }
  }

  return samples;
}

function collectGeometrySamples(signal) {
  const samples = [];

  for (const entry of signal.evidence || []) {
    const location = entry?.normalized_location;
    if (!location) {
      continue;
    }

    samples.push({
      x: Number(location.x) || 0,
      y: Number(location.y) || 0,
      width: Number(location.width) || 0,
      height: Number(location.height) || 0,
    });
  }

  return samples;
}

function collectPatternSamples(signal) {
  const samples = [];

  for (const entry of signal.evidence || []) {
    const density = entry?.evidence?.edgeDensity;
    if (typeof density === "number") {
      samples.push(density);
    }
  }

  return samples;
}

function measureColorSignal(signal) {
  const samples = collectColorSamples(signal);
  if (!samples.length) {
    return null;
  }

  const rValues = samples.map((sample) => sample.r);
  const gValues = samples.map((sample) => sample.g);
  const bValues = samples.map((sample) => sample.b);
  const hsvSamples = samples.map((sample) => rgbToHsv(sample.r, sample.g, sample.b));
  const hValues = hsvSamples.map((sample) => sample.h);
  const sValues = hsvSamples.map((sample) => sample.s);
  const vValues = hsvSamples.map((sample) => sample.v);
  const rgbMean = [
    roundMetric(average(rValues)),
    roundMetric(average(gValues)),
    roundMetric(average(bValues)),
  ];

  return {
    signal_id: signal.signal_id,
    signal_type: signal.type,
    type: "color",
    value: [
      range(rValues).map((value) => roundMetric(value, 2)),
      range(gValues).map((value) => roundMetric(value, 2)),
      range(bValues).map((value) => roundMetric(value, 2)),
    ],
    normalized_value: [
      range(rValues).map((value) => roundMetric(value / 255, 3)),
      range(gValues).map((value) => roundMetric(value / 255, 3)),
      range(bValues).map((value) => roundMetric(value / 255, 3)),
    ],
    hsv_range: [
      range(hValues).map((value) => roundMetric(value, 2)),
      range(sValues).map((value) => roundMetric(value, 3)),
      range(vValues).map((value) => roundMetric(value, 3)),
    ],
    hsv_mean: [
      roundMetric(average(hValues)),
      roundMetric(average(sValues), 3),
      roundMetric(average(vValues), 3),
    ],
    rgb_mean: rgbMean,
    support_frames: signal.support_frames,
    frame_ids: signal.frame_ids,
  };
}

function measureGeometrySignal(signal, thresholds) {
  const samples = collectGeometrySamples(signal);
  if (!samples.length) {
    return null;
  }

  const widths = samples.map((sample) => sample.width);
  const heights = samples.map((sample) => sample.height);
  const centersX = samples.map((sample) => sample.x + (sample.width / 2));
  const centersY = samples.map((sample) => sample.y + (sample.height / 2));
  const aspectRatios = samples.map((sample) => sample.height === 0 ? 0 : sample.width / sample.height);
  const areaRatios = samples.map((sample) => sample.width * sample.height);
  const spanX = range(centersX);
  const spanY = range(centersY);
  const spacingRatio = Math.max(spanX[1] - spanX[0], spanY[1] - spanY[0]);
  const aspectRatio = median(aspectRatios);
  const areaRatio = median(areaRatios);

  return {
    signal_id: signal.signal_id,
    signal_type: signal.type,
    type: "spacing",
    value: roundMetric(aspectRatio),
    normalized_value: roundMetric(clamp01(areaRatio), 3),
    metrics: {
      span_x: roundMetric(spanX[1] - spanX[0], 4),
      span_y: roundMetric(spanY[1] - spanY[0], 4),
      width_median: roundMetric(median(widths), 4),
      height_median: roundMetric(median(heights), 4),
      spacing_ratio: roundMetric(spacingRatio, 4),
    },
    support_frames: signal.support_frames,
    frame_ids: signal.frame_ids,
    normalization: {
      maxSpacingNormalization: thresholds.maxSpacingNormalization,
    },
  };
}

function measurePatternSignal(signal) {
  const densities = collectPatternSamples(signal);
  if (!densities.length) {
    return null;
  }

  const minDensity = range(densities)[0];
  const maxDensity = range(densities)[1];
  const meanDensity = average(densities);

  return {
    signal_id: signal.signal_id,
    signal_type: signal.type,
    type: "pattern_density",
    value: roundMetric(meanDensity, 4),
    normalized_value: roundMetric(clamp01(meanDensity), 4),
    metrics: {
      density_min: roundMetric(minDensity, 4),
      density_max: roundMetric(maxDensity, 4),
      density_range: roundMetric(maxDensity - minDensity, 4),
    },
    support_frames: signal.support_frames,
    frame_ids: signal.frame_ids,
  };
}

function sortBySupport(left, right) {
  if (right.support_frames !== left.support_frames) {
    return right.support_frames - left.support_frames;
  }

  return left.signal_id.localeCompare(right.signal_id);
}

export function evaluateSignalMeasurements(stableSignals, options = {}) {
  const thresholds = { ...DEFAULT_SIGNAL_MEASUREMENT_THRESHOLDS, ...(options.thresholds || {}) };
  const signals = Array.from(stableSignals || []);
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  const measurements = [];
  const discarded_measurements = [];

  for (let index = 0; index < signals.length; index += 1) {
    const signal = signals[index];
    let measurement = null;

    if (signal.type === "color") {
      measurement = measureColorSignal(signal);
    } else if (signal.type === "geometry") {
      measurement = measureGeometrySignal(signal, thresholds);
    } else if (signal.type === "pattern") {
      measurement = measurePatternSignal(signal);
    }

    if (measurement) {
      measurements.push(measurement);
    } else {
      discarded_measurements.push({
        signal_id: signal.signal_id,
        signal_type: signal.type,
        reason: "stable signal did not expose measurable pixel values",
      });
    }

    if (onProgress) {
      onProgress({
        completed: index + 1,
        total: signals.length,
        current: signal,
      });
    }
  }

  measurements.sort(sortBySupport);
  discarded_measurements.sort((left, right) => left.signal_id.localeCompare(right.signal_id));

  return {
    measurements,
    discarded_measurements,
  };
}

export { DEFAULT_SIGNAL_MEASUREMENT_THRESHOLDS };
