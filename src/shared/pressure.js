import { SCALE_MILESTONES } from "./constants.js";

export function clampPercent(value) {
  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped * 10) / 10;
}

export function pressureFromLength(length, cap, options = {}) {
  const lengthRatio = cap > 0 ? (length / cap) * 100 : 0;
  const textareaPenalty = options.textareaMounted ? 10 : 0;
  const scanPenalty = options.fullScanActive ? 12 : 0;
  const nearCapBoost = lengthRatio > 80 ? 15 : 0;
  const base = lengthRatio * 0.7;
  return clampPercent(base + textareaPenalty + scanPenalty + nearCapBoost);
}

export function pressureFromEngineState(dominantScale, previewLength, engineStrategy, previewAnalysisActive) {
  if (dominantScale.boundaryStatus === "outside supported boundary") {
    return 95;
  }

  const scaleIndex = Math.max(0, dominantScale.group || 0);
  const scaleBandPressure = scaleIndex === 0 ? 5 : Math.min(80, Math.log10(scaleIndex + 1) * 22 + 8);
  const strategyPenalty = engineStrategy === "derived" ? 6 : 0;
  const previewPenalty = Math.min(8, previewLength / 18);
  const analysisPenalty = previewAnalysisActive ? 4 : 0;
  return clampPercent(scaleBandPressure + strategyPenalty + previewPenalty + analysisPenalty);
}

export function pressureFromBoundary(dominantScale) {
  if (dominantScale.boundaryStatus === "highest supported real entry") {
    return 70;
  }

  if (dominantScale.boundaryStatus === "outside supported boundary") {
    return 100;
  }

  if (dominantScale.sourceLabel === "generated helper") {
    return Math.min(24, Math.max(8, (dominantScale.group || 0) / 40));
  }

  return 0;
}

export function getPressureSourceLabel(mode, labEnabled, dominantScale) {
  if (labEnabled) {
    return "Symbolic override";
  }

  if (dominantScale.boundaryStatus === "highest supported real entry" || dominantScale.boundaryStatus === "outside supported boundary") {
    return "Boundary-limited";
  }

  return mode === "engine" ? "Engine-bound" : "Render-bound";
}

export function getScaleBand(value) {
  const magnitude = value < 0n ? -value : value;
  let active = { label: "sub-thousand", value: 0n };
  for (const band of SCALE_MILESTONES) {
    if (magnitude >= band.value) {
      active = band;
    }
  }
  return active;
}
