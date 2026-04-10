import { GALAXY_PHASE1_STARS, GALAXY_PHASE1_CONSTELLATIONS, GALAXY_PHASE1_REGION } from "./data/phase1-data.js";
import { GALAXY_PHASE2_CATALOG_STARS } from "./data/catalog-phase2-data.js";
import { GALAXY_PHASE2_GENERATED_STARS } from "./data/generated-phase2-data.js";
import { createGalaxyCanvas } from "./galaxy-canvas.js";

const SOURCE_METADATA = Object.freeze({
  anchor: Object.freeze({
    label: "Observed anchor",
    confidence: "high",
    sourceMeaning: "Human-known reference stars with fixed identifiers and positions.",
    confidenceMeaning: "High confidence because the layer is observed and human-named.",
  }),
  catalog: Object.freeze({
    label: "Measured catalog",
    confidence: "high",
    sourceMeaning: "Bounded catalog stars with measured positions from survey data.",
    confidenceMeaning: "High confidence because the layer is measured from a catalog subset.",
  }),
  generated: Object.freeze({
    label: "Generated model",
    confidence: "statistical",
    sourceMeaning: "Inferred stars created from region density rules and constrained generation.",
    confidenceMeaning: "Statistical confidence because the layer is modeled, not measured.",
  }),
});

function formatDistance(distanceLy) {
  return `${Number(distanceLy).toLocaleString(undefined, { maximumFractionDigits: 1 })} ly`;
}

function formatMagnitude(magnitude) {
  return magnitude >= 0 ? `+${magnitude.toFixed(2)}` : magnitude.toFixed(2);
}

function setTextContent(doc, id, value) {
  const node = doc.getElementById(id);
  if (node) {
    node.textContent = value;
  }
}

function getSourceMetadata(type) {
  return SOURCE_METADATA[type] || SOURCE_METADATA.anchor;
}

function setStarInfo(doc, star) {
  if (!star) {
    return;
  }

  const metadata = getSourceMetadata(star.type);

  setTextContent(doc, "galaxy-info-name", star.name);
  setTextContent(doc, "galaxy-info-type", star.type);
  setTextContent(doc, "galaxy-info-source", star.source);
  setTextContent(doc, "galaxy-info-confidence", metadata.confidence);
  setTextContent(doc, "galaxy-info-constellation", star.constellation);
  setTextContent(doc, "galaxy-info-ra", `${star.ra.toFixed(3)}°`);
  setTextContent(doc, "galaxy-info-dec", `${star.dec.toFixed(3)}°`);
  setTextContent(doc, "galaxy-info-distance", formatDistance(star.distance_ly));
  setTextContent(doc, "galaxy-info-magnitude", formatMagnitude(star.magnitude));
  setTextContent(doc, "galaxy-info-source-meaning", metadata.sourceMeaning);
  setTextContent(doc, "galaxy-info-confidence-meaning", metadata.confidenceMeaning);
  setTextContent(doc, "galaxy-info-subtitle", `${star.name} is a ${metadata.label.toLowerCase()} in ${star.constellation}.`);
}

function setEmptyStarInfo(doc) {
  [
    "galaxy-info-name",
    "galaxy-info-type",
    "galaxy-info-source",
    "galaxy-info-confidence",
    "galaxy-info-constellation",
    "galaxy-info-ra",
    "galaxy-info-dec",
    "galaxy-info-distance",
    "galaxy-info-magnitude",
  ].forEach((id) => setTextContent(doc, id, "-"));
  setTextContent(doc, "galaxy-info-source-meaning", "No star matches the current source and range filters.");
  setTextContent(doc, "galaxy-info-confidence-meaning", "Observed and measured layers stay high confidence; generated layers stay statistical.");
  setTextContent(doc, "galaxy-info-subtitle", "No stars match the current filters.");
}

function setRegionSummary(doc) {
  setTextContent(doc, "galaxy-info-region", GALAXY_PHASE1_REGION.name);
}

function mountGalaxyPage(doc = document) {
  const canvas = doc.getElementById("galaxy-canvas");
  const anchorToggle = doc.getElementById("anchor-toggle");
  const catalogToggle = doc.getElementById("catalog-toggle");
  const generatedToggle = doc.getElementById("generated-toggle");
  const distanceRange = doc.getElementById("distance-range");
  const magnitudeRange = doc.getElementById("magnitude-range");
  const distanceRangeValue = doc.getElementById("distance-range-value");
  const magnitudeRangeValue = doc.getElementById("magnitude-range-value");
  if (!canvas) {
    return null;
  }

  setRegionSummary(doc);

  const stars = [...GALAXY_PHASE1_STARS, ...GALAXY_PHASE2_CATALOG_STARS, ...GALAXY_PHASE2_GENERATED_STARS];
  const visibility = {
    anchor: true,
    catalog: false,
    generated: false,
    maxDistanceLy: Number(distanceRange?.value ?? 12500),
    maxMagnitude: Number(magnitudeRange?.value ?? 14),
  };
  let selectedStarId = GALAXY_PHASE1_STARS[0]?.id ?? null;

  const controller = createGalaxyCanvas(canvas, {
    stars,
    constellations: GALAXY_PHASE1_CONSTELLATIONS,
    selectedStarId,
    visibility,
    onSelect: (star) => {
      selectedStarId = star.id;
      setStarInfo(doc, star);
    },
  });

  if (GALAXY_PHASE1_STARS[0]) {
    setStarInfo(doc, GALAXY_PHASE1_STARS[0]);
  }

  function syncControlState() {
    if (anchorToggle) {
      anchorToggle.setAttribute("aria-pressed", String(visibility.anchor));
      anchorToggle.classList.toggle("is-active", visibility.anchor);
      anchorToggle.classList.toggle("is-muted", !visibility.anchor);
    }

    if (catalogToggle) {
      catalogToggle.setAttribute("aria-pressed", String(visibility.catalog));
      catalogToggle.classList.toggle("is-active", visibility.catalog);
      catalogToggle.classList.toggle("is-muted", !visibility.catalog);
    }

    if (generatedToggle) {
      generatedToggle.setAttribute("aria-pressed", String(visibility.generated));
      generatedToggle.classList.toggle("is-active", visibility.generated);
      generatedToggle.classList.toggle("is-muted", !visibility.generated);
      generatedToggle.classList.toggle("is-generated", visibility.generated);
    }

    if (distanceRangeValue) {
      distanceRangeValue.textContent = `0 - ${formatDistance(visibility.maxDistanceLy).replace(" ly", "")} ly`;
    }

    if (magnitudeRangeValue) {
      magnitudeRangeValue.textContent = `${Number(visibility.maxMagnitude).toFixed(1)} and brighter`;
    }
  }

  function applyVisibility() {
    controller.setVisibility(visibility);
    syncControlState();
    syncSelectionToVisibleLayer();
  }

  function setSourceEnabled(source, pressed) {
    visibility[source] = Boolean(pressed);
    applyVisibility();
  }

  function setDistanceMax(value) {
    visibility.maxDistanceLy = Number(value);
    applyVisibility();
  }

  function setMagnitudeMax(value) {
    visibility.maxMagnitude = Number(value);
    applyVisibility();
  }

  function starMatchesFilters(star) {
    if (!visibility[star.type]) {
      return false;
    }

    if (star.distance_ly > visibility.maxDistanceLy) {
      return false;
    }

    if (star.magnitude > visibility.maxMagnitude) {
      return false;
    }

    return true;
  }

  function syncSelectionToVisibleLayer() {
    const fallback = stars.find(starMatchesFilters);
    if (fallback && fallback.id !== selectedStarId) {
      selectedStarId = fallback.id;
      controller.setSelectedStarId(fallback.id);
      setStarInfo(doc, fallback);
      return;
    }

    if (!fallback) {
      setEmptyStarInfo(doc);
    }
  }

  if (anchorToggle) {
    anchorToggle.addEventListener("click", () => {
      setSourceEnabled("anchor", !visibility.anchor);
    });
  }

  if (catalogToggle) {
    catalogToggle.addEventListener("click", () => {
      setSourceEnabled("catalog", !visibility.catalog);
    });
  }

  if (generatedToggle) {
    generatedToggle.addEventListener("click", () => {
      setSourceEnabled("generated", !visibility.generated);
    });
  }

  if (distanceRange) {
    distanceRange.addEventListener("input", (event) => {
      setDistanceMax(event.target.value);
    });
  }

  if (magnitudeRange) {
    magnitudeRange.addEventListener("input", (event) => {
      setMagnitudeMax(event.target.value);
    });
  }

  applyVisibility();

  if (!stars.some((star) => star.id === selectedStarId && starMatchesFilters(star))) {
    const fallback = stars.find(starMatchesFilters);
    if (fallback) {
      selectedStarId = fallback.id;
      controller.setSelectedStarId(fallback.id);
      setStarInfo(doc, fallback);
    } else {
      setEmptyStarInfo(doc);
    }
  }

  return controller;
}

mountGalaxyPage();

export { mountGalaxyPage };
