const DENSITY_CONFIG = Object.freeze({
  low: { baseCount: 36, spread: 0.55, magnitudeFloor: 9.2, magnitudeCeiling: 14.2 },
  medium: { baseCount: 72, spread: 0.72, magnitudeFloor: 8.4, magnitudeCeiling: 13.4 },
  high: { baseCount: 108, spread: 0.88, magnitudeFloor: 7.8, magnitudeCeiling: 12.8 },
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hashSeed(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seedText) {
  let state = hashSeed(seedText) || 1;
  return function next() {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function resolveDensityConfig(density) {
  if (typeof density === "number" && Number.isFinite(density)) {
    return {
      baseCount: clamp(Math.round(density), 16, 180),
      spread: 0.72,
      magnitudeFloor: 8.4,
      magnitudeCeiling: 13.4,
    };
  }

  return DENSITY_CONFIG[density] || DENSITY_CONFIG.medium;
}

function toRange(rng, min, max) {
  return min + rng() * (max - min);
}

export function generateStars(region, density = "medium") {
  const config = resolveDensityConfig(density);
  const rng = createRng(`${region.id}:${density}`);
  const count = clamp(
    Math.round(config.baseCount + Math.max(0, region.spanLy / 3500)),
    24,
    180,
  );
  const stars = [];

  for (let index = 0; index < count; index += 1) {
    const armBias = region.kind === "arm" ? 0.82 : 0.5;
    const focus = armBias + (rng() - 0.5) * config.spread;
    const ra = (toRange(rng, 0, 360) + focus * 18 + index * 0.11) % 360;
    const decCenter = region.kind === "arm" ? 6 : 0;
    const dec = clamp(decCenter + (rng() - 0.5) * 48 * config.spread, -90, 90);
    const magnitude = toRange(rng, config.magnitudeFloor, config.magnitudeCeiling);
    const distance = toRange(rng, 120, 12000);

    stars.push({
      id: `gen_${region.id}_${String(index + 1).padStart(3, "0")}`,
      name: `Generated Star ${String(index + 1).padStart(3, "0")}`,
      type: "generated",
      source: "model",
      ra,
      dec,
      distance_ly: distance,
      magnitude,
      constellation: region.name,
    });
  }

  return Object.freeze(stars);
}
