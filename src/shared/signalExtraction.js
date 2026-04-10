const DEFAULT_SIGNAL_EXTRACTION_THRESHOLDS = Object.freeze({
  maxSampleSize: 224,
  edgeMagnitudeThreshold: 44,
  lineDensityThreshold: 0.22,
  rectangleBorderDensityThreshold: 0.14,
  rectangleInteriorCeiling: 0.05,
  patternVarianceThreshold: 180,
  patternEdgeDensityThreshold: 0.06,
  maxColorFeatures: 4,
  maxLineFeatures: 4,
  maxRectangleFeatures: 4,
  maxPatternFeatures: 4,
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

function createSamplingCanvas(width, height, doc = globalThis.document) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  const canvas = doc.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
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

function luminanceFromRgb(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function buildSampleData(imageData) {
  const { data } = imageData;
  const length = data.length / 4;
  const rgb = new Uint8ClampedArray(length * 3);
  const luminance = new Float32Array(length);
  const histogram = new Uint32Array(256);
  let sum = 0;

  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const value = a === 0 ? 0 : luminanceFromRgb(r, g, b);
    rgb[j * 3] = r;
    rgb[j * 3 + 1] = g;
    rgb[j * 3 + 2] = b;
    luminance[j] = value;
    sum += value;
    histogram[Math.max(0, Math.min(255, Math.round(value)))] += 1;
  }

  return {
    rgb,
    luminance,
    histogram,
    brightness: length ? sum / length : 0,
  };
}

function computeSobelEdges(luminance, width, height, threshold) {
  const edges = new Uint8Array(width * height);
  const orientation = new Float32Array(width * height);
  const rowDensity = new Float32Array(height);
  const columnDensity = new Float32Array(width);
  let edgeCount = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
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

      if (magnitude >= threshold) {
        edges[index] = 1;
        edgeCount += 1;
        rowDensity[y] += 1;
        columnDensity[x] += 1;
      }

      orientation[index] = Math.atan2(gy, gx);
    }
  }

  for (let y = 0; y < height; y += 1) {
    rowDensity[y] /= Math.max(1, width);
  }

  for (let x = 0; x < width; x += 1) {
    columnDensity[x] /= Math.max(1, height);
  }

  return {
    edges,
    orientation,
    rowDensity,
    columnDensity,
    edgeDensity: edgeCount / Math.max(1, width * height),
  };
}

function createIntegral(values, width, height) {
  const integral = new Float32Array((width + 1) * (height + 1));

  for (let y = 1; y <= height; y += 1) {
    let rowSum = 0;
    for (let x = 1; x <= width; x += 1) {
      rowSum += values[(y - 1) * width + (x - 1)];
      integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + rowSum;
    }
  }

  return integral;
}

function regionSum(integral, width, x, y, w, h) {
  const stride = width + 1;
  const x1 = Math.max(0, x);
  const y1 = Math.max(0, y);
  const x2 = Math.max(x1, x + w);
  const y2 = Math.max(y1, y + h);
  return (
    integral[y2 * stride + x2] -
    integral[y1 * stride + x2] -
    integral[y2 * stride + x1] +
    integral[y1 * stride + x1]
  );
}

function rgbToHex(r, g, b) {
  return [r, g, b]
    .map((component) => Math.max(0, Math.min(255, component)).toString(16).padStart(2, "0"))
    .join("");
}

function colorNameFromRgb(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 510;
  const saturation = max === 0 ? 0 : delta / max;

  if (lightness < 0.12) return "black";
  if (lightness > 0.9) return "white";
  if (saturation < 0.14) return "gray";

  const hue =
    delta === 0
      ? 0
      : max === r
        ? ((g - b) / delta) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
  const hueDegrees = ((hue * 60) + 360) % 360;

  if (hueDegrees < 20 || hueDegrees >= 345) return lightness < 0.35 ? "brown" : "red";
  if (hueDegrees < 45) return "orange";
  if (hueDegrees < 70) return "yellow";
  if (hueDegrees < 165) return "green";
  if (hueDegrees < 195) return "cyan";
  if (hueDegrees < 255) return "blue";
  if (hueDegrees < 300) return "purple";
  return "magenta";
}

function averageColorInRegion(rgb, width, x, y, w, h) {
  let count = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      const index = (row * width + col) * 3;
      sumR += rgb[index];
      sumG += rgb[index + 1];
      sumB += rgb[index + 2];
      count += 1;
    }
  }

  if (!count) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: Math.round(sumR / count),
    g: Math.round(sumG / count),
    b: Math.round(sumB / count),
  };
}

function buildColorClusters(rgb, width, height, thresholds) {
  const clusters = new Map();
  const cellsX = Math.max(4, Math.round(width / 18));
  const cellsY = Math.max(4, Math.round(height / 18));
  const cellWidth = Math.max(1, Math.floor(width / cellsX));
  const cellHeight = Math.max(1, Math.floor(height / cellsY));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const r = rgb[index];
      const g = rgb[index + 1];
      const b = rgb[index + 2];
      const key = `${r >> 5}:${g >> 5}:${b >> 5}`;

      let cluster = clusters.get(key);
      if (!cluster) {
        cluster = {
          count: 0,
          sumR: 0,
          sumG: 0,
          sumB: 0,
          minX: x,
          minY: y,
          maxX: x,
          maxY: y,
          cellHits: new Map(),
        };
        clusters.set(key, cluster);
      }

      cluster.count += 1;
      cluster.sumR += r;
      cluster.sumG += g;
      cluster.sumB += b;
      cluster.minX = Math.min(cluster.minX, x);
      cluster.minY = Math.min(cluster.minY, y);
      cluster.maxX = Math.max(cluster.maxX, x);
      cluster.maxY = Math.max(cluster.maxY, y);

      const cellX = Math.min(cellsX - 1, Math.floor(x / cellWidth));
      const cellY = Math.min(cellsY - 1, Math.floor(y / cellHeight));
      const cellKey = `${cellX}:${cellY}`;
      cluster.cellHits.set(cellKey, (cluster.cellHits.get(cellKey) || 0) + 1);
    }
  }

  return Array.from(clusters.entries())
    .map(([key, cluster]) => {
      const avgR = Math.round(cluster.sumR / cluster.count);
      const avgG = Math.round(cluster.sumG / cluster.count);
      const avgB = Math.round(cluster.sumB / cluster.count);
      const dominantCell = Array.from(cluster.cellHits.entries()).sort((a, b) => b[1] - a[1])[0];
      const [cellX, cellY] = dominantCell ? dominantCell[0].split(":").map(Number) : [0, 0];
      const location = {
        x: cellX * cellWidth,
        y: cellY * cellHeight,
        width: Math.min(width - cellX * cellWidth, cellWidth),
        height: Math.min(height - cellY * cellHeight, cellHeight),
      };
      return {
        key,
        count: cluster.count,
        avgR,
        avgG,
        avgB,
        name: colorNameFromRgb(avgR, avgG, avgB),
        hex: rgbToHex(avgR, avgG, avgB),
        location,
        bbox: {
          x: cluster.minX,
          y: cluster.minY,
          width: cluster.maxX - cluster.minX + 1,
          height: cluster.maxY - cluster.minY + 1,
        },
        coverage: cluster.count / Math.max(1, width * height),
      };
    })
    .filter((entry) => entry.coverage >= 0.02 || entry.count >= thresholds.minColorPixels)
    .sort((a, b) => b.count - a.count)
    .slice(0, thresholds.maxColorFeatures);
}

function groupRuns(indices, minRunLength = 2) {
  const runs = [];
  let start = null;
  let previous = null;

  for (const index of indices) {
    if (start === null) {
      start = index;
      previous = index;
      continue;
    }

    if (index === previous + 1) {
      previous = index;
      continue;
    }

    if (previous - start + 1 >= minRunLength) {
      runs.push([start, previous]);
    }

    start = index;
    previous = index;
  }

  if (start !== null && previous - start + 1 >= minRunLength) {
    runs.push([start, previous]);
  }

  return runs;
}

function detectLineCandidates(edges, orientation, width, height, thresholds) {
  const verticalIndices = [];
  const horizontalIndices = [];

  for (let x = 0; x < width; x += 1) {
    let count = 0;
    for (let y = 0; y < height; y += 1) {
      count += edges[y * width + x];
    }
    if (count / Math.max(1, height) >= thresholds.lineDensityThreshold) {
      verticalIndices.push(x);
    }
  }

  for (let y = 0; y < height; y += 1) {
    let count = 0;
    for (let x = 0; x < width; x += 1) {
      count += edges[y * width + x];
    }
    if (count / Math.max(1, width) >= thresholds.lineDensityThreshold) {
      horizontalIndices.push(y);
    }
  }

  const vertical = groupRuns(verticalIndices).map(([start, end]) => {
    const widthSpan = end - start + 1;
    const bbox = {
      x: start,
      y: 0,
      width: widthSpan,
      height,
    };
    const support = Array.from({ length: widthSpan }, (_, offset) => start + offset).reduce(
      (total, column) => {
        let count = 0;
        for (let row = 0; row < height; row += 1) {
          count += edges[row * width + column];
        }
        return total + count;
      },
      0,
    );
    const color = averageColorInRegion(
      orientation.rgb,
      width,
      bbox.x,
      0,
      Math.max(1, bbox.width),
      height,
    );
    return {
      kind: "vertical",
      bbox,
      support,
      value: "vertical structure",
      colorName: colorNameFromRgb(color.r, color.g, color.b),
      hex: rgbToHex(color.r, color.g, color.b),
      orientation: "vertical",
      coverage: support / Math.max(1, widthSpan * height),
    };
  });

  const horizontal = groupRuns(horizontalIndices).map(([start, end]) => {
    const heightSpan = end - start + 1;
    const bbox = {
      x: 0,
      y: start,
      width,
      height: heightSpan,
    };
    const support = Array.from({ length: heightSpan }, (_, offset) => start + offset).reduce(
      (total, row) => {
        let count = 0;
        for (let col = 0; col < width; col += 1) {
          count += edges[row * width + col];
        }
        return total + count;
      },
      0,
    );
    const color = averageColorInRegion(
      orientation.rgb,
      width,
      0,
      bbox.y,
      width,
      Math.max(1, bbox.height),
    );
    return {
      kind: "horizontal",
      bbox,
      support,
      value: "horizontal structure",
      colorName: colorNameFromRgb(color.r, color.g, color.b),
      hex: rgbToHex(color.r, color.g, color.b),
      orientation: "horizontal",
      coverage: support / Math.max(1, width * heightSpan),
    };
  });

  return [...vertical, ...horizontal].sort((a, b) => b.support - a.support);
}

function buildRectangles(edges, luminance, width, height, thresholds) {
  const edgeIntegral = createIntegral(edges, width, height);
  const candidates = [];
  const widths = [Math.round(width * 0.18), Math.round(width * 0.26), Math.round(width * 0.36), Math.round(width * 0.5)];
  const heights = [Math.round(height * 0.18), Math.round(height * 0.26), Math.round(height * 0.36), Math.round(height * 0.5)];
  const step = Math.max(6, Math.round(Math.min(width, height) / 18));

  for (const boxWidth of widths) {
    for (const boxHeight of heights) {
      if (boxWidth < 8 || boxHeight < 8 || boxWidth > width || boxHeight > height) {
        continue;
      }

      for (let y = 0; y <= height - boxHeight; y += step) {
        for (let x = 0; x <= width - boxWidth; x += step) {
          const totalEdges = regionSum(edgeIntegral, width, x, y, boxWidth, boxHeight);
          const innerWidth = Math.max(0, boxWidth - 4);
          const innerHeight = Math.max(0, boxHeight - 4);
          const innerEdges =
            innerWidth > 0 && innerHeight > 0
              ? regionSum(edgeIntegral, width, x + 2, y + 2, innerWidth, innerHeight)
              : 0;
          const borderEdges = totalEdges - innerEdges;
          const perimeter = Math.max(1, (boxWidth * 2) + (boxHeight * 2) - 4);
          const area = boxWidth * boxHeight;
          const interiorArea = Math.max(1, innerWidth * innerHeight);
          const borderDensity = borderEdges / perimeter;
          const interiorDensity = innerEdges / interiorArea;
          const borderToInterior = borderDensity - interiorDensity;

          if (
            borderDensity >= thresholds.rectangleBorderDensityThreshold &&
            interiorDensity <= thresholds.rectangleInteriorCeiling &&
            borderToInterior >= 0.04
          ) {
            candidates.push({
              bbox: { x, y, width: boxWidth, height: boxHeight },
              borderDensity,
              interiorDensity,
              borderToInterior,
              area,
              aspectRatio: boxWidth / boxHeight,
            });
          }
        }
      }
    }
  }

  const seen = new Set();
  return candidates
    .sort((a, b) => b.borderDensity - a.borderDensity || b.area - a.area)
    .filter((candidate) => {
      const key = `${candidate.bbox.x}:${candidate.bbox.y}:${candidate.bbox.width}:${candidate.bbox.height}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, thresholds.maxRectangleFeatures)
    .map((candidate) => {
      const isLarge = candidate.area >= (width * height * 0.18);
      const isCompact = candidate.area <= (width * height * 0.16);
      let value = "rectangular region";
      let regionType = "rectangle";
      if (isLarge && candidate.aspectRatio >= 0.5 && candidate.aspectRatio <= 2.5) {
        value = "rectangular geometry";
        regionType = "window_geometry";
      } else if (isCompact) {
        value = "rectangular region";
        regionType = "signage_bbox";
      }
      return {
        type: "geometry",
        value,
        role: regionType,
        location: candidate.bbox,
        evidence: {
          borderDensity: roundMetric(candidate.borderDensity, 4),
          interiorDensity: roundMetric(candidate.interiorDensity, 4),
          aspectRatio: roundMetric(candidate.aspectRatio, 2),
        },
      };
    });
}

function buildPatternRegions(luminance, edges, width, height, thresholds) {
  const windowSizes = [
    Math.max(12, Math.round(Math.min(width, height) * 0.18)),
    Math.max(16, Math.round(Math.min(width, height) * 0.26)),
    Math.max(20, Math.round(Math.min(width, height) * 0.34)),
  ];
  const step = Math.max(6, Math.round(Math.min(width, height) / 20));
  const edgeIntegral = createIntegral(edges, width, height);
  const varianceCandidates = [];

  for (const size of windowSizes) {
    const boxWidth = Math.min(width, size);
    const boxHeight = Math.min(height, size);

    for (let y = 0; y <= height - boxHeight; y += step) {
      for (let x = 0; x <= width - boxWidth; x += step) {
        const interior = [];
        for (let row = y; row < y + boxHeight; row += 1) {
          for (let col = x; col < x + boxWidth; col += 1) {
            interior.push(luminance[row * width + col]);
          }
        }

        let mean = 0;
        for (const value of interior) {
          mean += value;
        }
        mean /= Math.max(1, interior.length);

        let variance = 0;
        for (const value of interior) {
          const delta = value - mean;
          variance += delta * delta;
        }
        variance /= Math.max(1, interior.length);

        const edgeDensity = regionSum(edgeIntegral, width, x, y, boxWidth, boxHeight) / Math.max(1, boxWidth * boxHeight);

        if (
          variance >= thresholds.patternVarianceThreshold &&
          edgeDensity >= thresholds.patternEdgeDensityThreshold
        ) {
          varianceCandidates.push({
            bbox: { x, y, width: boxWidth, height: boxHeight },
            variance,
            edgeDensity,
          });
        }
      }
    }
  }

  const seen = new Set();
  return varianceCandidates
    .sort((a, b) => b.variance - a.variance || b.edgeDensity - a.edgeDensity)
    .filter((candidate) => {
      const key = `${candidate.bbox.x}:${candidate.bbox.y}:${candidate.bbox.width}:${candidate.bbox.height}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, thresholds.maxPatternFeatures)
    .map((candidate) => ({
      type: "pattern",
      value: "textured region",
      location: candidate.bbox,
      evidence: {
        variance: roundMetric(candidate.variance),
        edgeDensity: roundMetric(candidate.edgeDensity, 4),
      },
    }));
}

function selectTopColorFeatures(colorClusters, thresholds) {
  return colorClusters.slice(0, thresholds.maxColorFeatures).map((cluster) => ({
    type: "color",
    value: cluster.name,
    location: cluster.location,
    evidence: {
      hex: `#${cluster.hex}`,
      pixelShare: roundMetric(cluster.coverage, 4),
      region: cluster.bbox,
    },
  }));
}

function selectLineFeatures(lineCandidates, thresholds) {
  return lineCandidates.slice(0, thresholds.maxLineFeatures).map((candidate) => ({
    type: "geometry",
    value: candidate.value,
    location: candidate.bbox,
    evidence: {
      orientation: candidate.orientation,
      support: candidate.support,
      color: candidate.hex ? `#${candidate.hex}` : undefined,
      colorName: candidate.colorName,
    },
  }));
}

function dedupeFeatures(features) {
  const seen = new Set();
  return features.filter((feature) => {
    const key = [
      feature.type,
      feature.value,
      feature.role || "",
      feature.location?.x ?? "",
      feature.location?.y ?? "",
      feature.location?.width ?? "",
      feature.location?.height ?? "",
    ].join("|");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function extractSignalsForFile(file, index, options = {}, doc = globalThis.document) {
  const thresholds = { ...DEFAULT_SIGNAL_EXTRACTION_THRESHOLDS, ...(options.thresholds || {}) };
  const frameId = resolveFramePath(file, index);
  try {
    const bitmap = await loadFrameBitmap(file);
    const scale = Math.min(1, thresholds.maxSampleSize / Math.max(bitmap.width || 1, bitmap.height || 1));
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
    const { rgb, luminance } = buildSampleData(imageData);
    const edges = computeSobelEdges(luminance, sampleWidth, sampleHeight, thresholds.edgeMagnitudeThreshold);
    const colorClusters = buildColorClusters(rgb, sampleWidth, sampleHeight, {
      minColorPixels: Math.max(80, Math.round((sampleWidth * sampleHeight) * 0.02)),
    });
    const lineCandidates = detectLineCandidates(edges.edges, { rgb }, sampleWidth, sampleHeight, thresholds);
    const rectangleFeatures = buildRectangles(edges.edges, luminance, sampleWidth, sampleHeight, thresholds);
    const patternFeatures = buildPatternRegions(luminance, edges.edges, sampleWidth, sampleHeight, thresholds);

    const observedFeatures = dedupeFeatures([
      ...selectTopColorFeatures(colorClusters, thresholds),
      ...selectLineFeatures(lineCandidates, thresholds),
      ...rectangleFeatures,
      ...patternFeatures,
    ]);

    return {
      frame_id: frameId,
      frame_size: {
        width: sampleWidth,
        height: sampleHeight,
      },
      observed_features: observedFeatures,
    };
  } catch (error) {
    return {
      frame_id: frameId,
      frame_size: null,
      observed_features: [],
      error: error instanceof Error ? error.message : "Unable to extract observed signals.",
    };
  }
}

export async function extractObservedSignals(files, options = {}, doc = globalThis.document) {
  const frameFiles = Array.from(files || []).sort((left, right) => {
    const leftPath = resolveFramePath(left, 0);
    const rightPath = resolveFramePath(right, 0);
    return leftPath.localeCompare(rightPath, undefined, { numeric: true, sensitivity: "base" });
  });
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;

  const observed = [];

  for (let index = 0; index < frameFiles.length; index += 1) {
    const result = await extractSignalsForFile(frameFiles[index], index, options, doc);
    observed.push(result);
    if (onProgress) {
      onProgress({
        completed: index + 1,
        total: frameFiles.length,
        current: result,
      });
    }
  }

  return observed;
}

export { DEFAULT_SIGNAL_EXTRACTION_THRESHOLDS };
