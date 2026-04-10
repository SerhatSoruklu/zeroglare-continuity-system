const DEFAULT_FRAME_ISOLATION_THRESHOLDS = Object.freeze({
  maxSampleSize: 256,
  minBlurVariance: 120,
  minBrightness: 28,
  maxBrightness: 228,
  minContrastRange: 42,
  minWindowEdgeDensity: 0.05,
  minWindowMeanGradient: 18,
  windowCropRatio: 0.42,
  edgeMagnitudeThreshold: 42,
});

function resolveFramePath(file, index) {
  if (typeof file?.webkitRelativePath === "string" && file.webkitRelativePath) {
    return file.webkitRelativePath;
  }

  if (typeof file?.relativePath === "string" && file.relativePath) {
    return file.relativePath;
  }

  if (typeof file?.name === "string" && file.name) {
    return file.name;
  }

  return `frame-${index + 1}`;
}

function roundMetric(value, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function computePercentileFromHistogram(histogram, total, percentile) {
  if (!total) {
    return 0;
  }

  const target = total * percentile;
  let cumulative = 0;

  for (let i = 0; i < histogram.length; i += 1) {
    cumulative += histogram[i];
    if (cumulative >= target) {
      return i;
    }
  }

  return histogram.length - 1;
}

function isSupportedImageFile(file) {
  if (!file) {
    return false;
  }

  if (typeof file.type === "string" && file.type.startsWith("image/")) {
    return true;
  }

  const path = String(file.webkitRelativePath || file.relativePath || file.name || "").toLowerCase();
  return /\.(avif|bmp|gif|jpe?g|png|tif?f|webp)$/i.test(path);
}

async function loadFrameBitmap(file) {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }

  if (typeof Image === "undefined" || typeof URL === "undefined") {
    throw new Error("Image decoding is not supported in this environment.");
  }

  return await new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Failed to decode image."));
    };

    image.src = imageUrl;
  });
}

function createSamplingCanvas(width, height, doc = globalThis.document) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  const canvas = doc.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function buildLuminanceData(imageData) {
  const { data } = imageData;
  const length = data.length / 4;
  const luminance = new Float32Array(length);
  const histogram = new Uint32Array(256);
  let sum = 0;

  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    const value = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    luminance[j] = value;
    sum += value;
    histogram[Math.max(0, Math.min(255, Math.round(value)))] += 1;
  }

  return {
    luminance,
    histogram,
    brightness: length ? sum / length : 0,
  };
}

function computeLaplacianVariance(luminance, width, height) {
  if (width < 3 || height < 3) {
    return 0;
  }

  let sum = 0;
  let sumSquares = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = luminance[y * width + x];
      const top = luminance[(y - 1) * width + x];
      const bottom = luminance[(y + 1) * width + x];
      const left = luminance[y * width + (x - 1)];
      const right = luminance[y * width + (x + 1)];
      const topLeft = luminance[(y - 1) * width + (x - 1)];
      const topRight = luminance[(y - 1) * width + (x + 1)];
      const bottomLeft = luminance[(y + 1) * width + (x - 1)];
      const bottomRight = luminance[(y + 1) * width + (x + 1)];

      const laplacian =
        (8 * center) -
        top -
        bottom -
        left -
        right -
        topLeft -
        topRight -
        bottomLeft -
        bottomRight;

      sum += laplacian;
      sumSquares += laplacian * laplacian;
      count += 1;
    }
  }

  if (!count) {
    return 0;
  }

  const mean = sum / count;
  return sumSquares / count - mean * mean;
}

function computeWindowEdgeMetrics(luminance, width, height, cropRatio, threshold) {
  const cropWidth = Math.max(4, Math.round(width * cropRatio));
  const cropHeight = Math.max(4, Math.round(height * cropRatio));
  const startX = Math.max(1, Math.floor((width - cropWidth) / 2));
  const startY = Math.max(1, Math.floor((height - cropHeight) / 2));
  const endX = Math.min(width - 1, startX + cropWidth - 1);
  const endY = Math.min(height - 1, startY + cropHeight - 1);

  let sumMagnitude = 0;
  let edgeCount = 0;
  let sampleCount = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const topLeft = luminance[(y - 1) * width + (x - 1)];
      const top = luminance[(y - 1) * width + x];
      const topRight = luminance[(y - 1) * width + (x + 1)];
      const left = luminance[y * width + (x - 1)];
      const right = luminance[y * width + (x + 1)];
      const bottomLeft = luminance[(y + 1) * width + (x - 1)];
      const bottom = luminance[(y + 1) * width + x];
      const bottomRight = luminance[(y + 1) * width + (x + 1)];

      const gx = -topLeft - (2 * left) - bottomLeft + topRight + (2 * right) + bottomRight;
      const gy = -topLeft - (2 * top) - topRight + bottomLeft + (2 * bottom) + bottomRight;
      const magnitude = Math.hypot(gx, gy);

      sumMagnitude += magnitude;
      if (magnitude >= threshold) {
        edgeCount += 1;
      }
      sampleCount += 1;
    }
  }

  return {
    cropX: startX,
    cropY: startY,
    cropWidth: endX - startX + 1,
    cropHeight: endY - startY + 1,
    meanGradient: sampleCount ? sumMagnitude / sampleCount : 0,
    edgeDensity: sampleCount ? edgeCount / sampleCount : 0,
  };
}

function evaluateFrame(metrics, thresholds) {
  const reasons = [];

  if (metrics.blurVariance < thresholds.minBlurVariance) {
    reasons.push(
      `high blur (variance ${metrics.blurVariance.toFixed(2)} < ${thresholds.minBlurVariance})`,
    );
  }

  if (metrics.brightness < thresholds.minBrightness) {
    reasons.push(
      `extremely dark (brightness ${metrics.brightness.toFixed(2)} < ${thresholds.minBrightness})`,
    );
  } else if (metrics.brightness > thresholds.maxBrightness) {
    reasons.push(
      `overexposed (brightness ${metrics.brightness.toFixed(2)} > ${thresholds.maxBrightness})`,
    );
  }

  if (metrics.contrastRange < thresholds.minContrastRange) {
    reasons.push(
      `low contrast (range ${metrics.contrastRange.toFixed(2)} < ${thresholds.minContrastRange})`,
    );
  }

  if (metrics.windowEdgeDensity < thresholds.minWindowEdgeDensity) {
    reasons.push(
      `insufficient visible structure in window region (edge density ${metrics.windowEdgeDensity.toFixed(4)} < ${thresholds.minWindowEdgeDensity})`,
    );
  }

  if (metrics.windowMeanGradient < thresholds.minWindowMeanGradient) {
    reasons.push(
      `window region too smooth (gradient ${metrics.windowMeanGradient.toFixed(2)} < ${thresholds.minWindowMeanGradient})`,
    );
  }

  return {
    kept: reasons.length === 0,
    reasons,
    decision: reasons.length === 0 ? "kept" : "discarded",
  };
}

async function analyzeSingleFrame(file, index, options = {}, doc = globalThis.document) {
  const thresholds = { ...DEFAULT_FRAME_ISOLATION_THRESHOLDS, ...(options.thresholds || {}) };
  const path = resolveFramePath(file, index);

  if (!isSupportedImageFile(file)) {
    return {
      path,
      index,
      fileName: file?.name || path,
      fileSize: typeof file?.size === "number" ? file.size : null,
      mimeType: typeof file?.type === "string" ? file.type : "",
      kept: false,
      decision: "discarded",
      reasons: ["unsupported file type"],
      metrics: null,
      thresholds,
    };
  }

  try {
    const bitmap = await loadFrameBitmap(file);
    const scale = Math.min(
      1,
      thresholds.maxSampleSize / Math.max(bitmap.width || 1, bitmap.height || 1),
    );
    const sampleWidth = Math.max(8, Math.round((bitmap.width || 1) * scale));
    const sampleHeight = Math.max(8, Math.round((bitmap.height || 1) * scale));
    const canvas = createSamplingCanvas(sampleWidth, sampleHeight, doc);
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("Unable to acquire a 2D drawing context.");
    }

    context.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);

    if (typeof bitmap.close === "function") {
      bitmap.close();
    }

    const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight);
    const { luminance, histogram, brightness } = buildLuminanceData(imageData);
    const contrastLow = computePercentileFromHistogram(histogram, luminance.length, 0.05);
    const contrastHigh = computePercentileFromHistogram(histogram, luminance.length, 0.95);
    const blurVariance = computeLaplacianVariance(luminance, sampleWidth, sampleHeight);
    const windowMetrics = computeWindowEdgeMetrics(
      luminance,
      sampleWidth,
      sampleHeight,
      thresholds.windowCropRatio,
      thresholds.edgeMagnitudeThreshold,
    );

    const metrics = {
      brightness: roundMetric(brightness),
      blurVariance: roundMetric(blurVariance),
      contrastRange: roundMetric(contrastHigh - contrastLow),
      windowEdgeDensity: roundMetric(windowMetrics.edgeDensity, 4),
      windowMeanGradient: roundMetric(windowMetrics.meanGradient),
      windowCrop: {
        x: windowMetrics.cropX,
        y: windowMetrics.cropY,
        width: windowMetrics.cropWidth,
        height: windowMetrics.cropHeight,
      },
    };

    const verdict = evaluateFrame(metrics, thresholds);

    return {
      path,
      index,
      fileName: file?.name || path,
      fileSize: typeof file?.size === "number" ? file.size : null,
      mimeType: typeof file?.type === "string" ? file.type : "",
      ...verdict,
      metrics,
      thresholds,
    };
  } catch (error) {
    return {
      path,
      index,
      fileName: file?.name || path,
      fileSize: typeof file?.size === "number" ? file.size : null,
      mimeType: typeof file?.type === "string" ? file.type : "",
      kept: false,
      decision: "discarded",
      reasons: [error instanceof Error ? error.message : "Unable to decode frame"],
      metrics: null,
      thresholds,
    };
  }
}

export async function analyzeFrameIsolation(files, options = {}, doc = globalThis.document) {
  const frameFiles = Array.from(files || []).sort((left, right) => {
    const leftPath = resolveFramePath(left, 0);
    const rightPath = resolveFramePath(right, 0);
    return leftPath.localeCompare(rightPath, undefined, { numeric: true, sensitivity: "base" });
  });
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;

  const diagnostics = [];

  for (let index = 0; index < frameFiles.length; index += 1) {
    const analysis = await analyzeSingleFrame(frameFiles[index], index, options, doc);
    diagnostics.push(analysis);
    if (onProgress) {
      onProgress({
        completed: index + 1,
        total: frameFiles.length,
        current: analysis,
      });
    }
  }

  const validFramePaths = diagnostics.filter((entry) => entry.kept).map((entry) => entry.path);

  return {
    validFramePaths,
    diagnostics,
  };
}

export { DEFAULT_FRAME_ISOLATION_THRESHOLDS };
