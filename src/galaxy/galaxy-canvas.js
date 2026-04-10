function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function projectStar(star, width, height) {
  return {
    x: (star.ra / 360) * width,
    y: (1 - (star.dec + 90) / 180) * height,
  };
}

function createStarSize(star) {
  if (star.type === "catalog") {
    return clamp(2.9 - star.magnitude * 0.06, 1.2, 2.7);
  }

  if (star.type === "generated") {
    return clamp(1.8 - star.magnitude * 0.03, 0.7, 1.45);
  }

  return clamp(6.8 - star.magnitude * 0.55, 2.4, 8.6);
}

function getStarOpacity(star, selected) {
  if (star.type === "catalog") {
    return selected ? 0.92 : 0.34;
  }

  if (star.type === "generated") {
    return selected ? 0.44 : 0.12;
  }

  return selected ? 1 : 0.84;
}

function getStarColor(star) {
  if (star.type === "catalog") {
    return { r: 190, g: 204, b: 255 };
  }

  if (star.type === "generated") {
    return { r: 161, g: 140, b: 255 };
  }

  return { r: 240, g: 247, b: 255 };
}

function getFillStyle(star, opacity) {
  const color = getStarColor(star);
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
}

export function createGalaxyCanvas(canvas, { stars, constellations, onSelect, selectedStarId = null, visibility = {} } = {}) {
  if (!canvas) {
    return {
      destroy() {},
      redraw() {},
      setSelectedStarId() {},
    };
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return {
      destroy() {},
      redraw() {},
      setSelectedStarId() {},
    };
  }

  const state = {
    width: 0,
    height: 0,
    ratio: 1,
    positions: [],
    selectedStarId,
    catalogEnabled: false,
    generatedEnabled: false,
    visibility: {
      anchor: visibility.anchor !== false,
      catalog: Boolean(visibility.catalog),
      generated: Boolean(visibility.generated),
      maxDistanceLy: typeof visibility.maxDistanceLy === "number" ? visibility.maxDistanceLy : Number.POSITIVE_INFINITY,
      maxMagnitude: typeof visibility.maxMagnitude === "number" ? visibility.maxMagnitude : Number.POSITIVE_INFINITY,
    },
  };

  const starById = new Map(stars.map((star) => [star.id, star]));
  const constellationPaths = constellations
    .map((constellation) => ({
      ...constellation,
      stars: constellation.star_ids.map((id) => starById.get(id)).filter(Boolean),
    }))
    .filter((constellation) => constellation.stars.length >= 2)
    .sort((left, right) => left.order - right.order);

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));

    state.width = width;
    state.height = height;
    state.ratio = ratio;

    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function buildPositions() {
    state.positions = stars.map((star) => ({
      star,
      ...projectStar(star, state.width, state.height),
      radius: createStarSize(star),
    }));
  }

  function matchesVisibility(star) {
    const sourceAllowed =
      (star.type === "anchor" && state.visibility.anchor) ||
      (star.type === "catalog" && (state.catalogEnabled || state.visibility.catalog)) ||
      (star.type === "generated" && (state.generatedEnabled || state.visibility.generated));

    if (!sourceAllowed) {
      return false;
    }

    if (star.distance_ly > state.visibility.maxDistanceLy) {
      return false;
    }

    if (star.magnitude > state.visibility.maxMagnitude) {
      return false;
    }

    return true;
  }

  function drawBackground() {
    context.clearRect(0, 0, state.width, state.height);

    const gradient = context.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, "rgba(7, 13, 26, 0.94)");
    gradient.addColorStop(1, "rgba(4, 8, 18, 0.86)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, state.width, state.height);

    context.strokeStyle = "rgba(125, 220, 255, 0.08)";
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 0; x <= state.width; x += 72) {
      context.moveTo(x + 0.5, 0);
      context.lineTo(x + 0.5, state.height);
    }
    for (let y = 0; y <= state.height; y += 72) {
      context.moveTo(0, y + 0.5);
      context.lineTo(state.width, y + 0.5);
    }
    context.stroke();

    const halo = context.createRadialGradient(state.width * 0.5, state.height * 0.42, 24, state.width * 0.5, state.height * 0.42, Math.max(state.width, state.height) * 0.68);
    halo.addColorStop(0, "rgba(125, 220, 255, 0.10)");
    halo.addColorStop(0.4, "rgba(161, 140, 255, 0.07)");
    halo.addColorStop(1, "rgba(2, 6, 23, 0)");
    context.fillStyle = halo;
    context.fillRect(0, 0, state.width, state.height);
  }

  function drawConstellations() {
    context.save();
    context.lineWidth = 1.5;
    context.strokeStyle = "rgba(143, 255, 230, 0.26)";
    context.shadowColor = "rgba(143, 255, 230, 0.22)";
    context.shadowBlur = 8;

    for (const constellation of constellationPaths) {
      context.beginPath();
      constellation.stars.forEach((star, index) => {
        const position = state.positions.find((entry) => entry.star.id === star.id);
        if (!position) {
          return;
        }
        if (index === 0) {
          context.moveTo(position.x, position.y);
        } else {
          context.lineTo(position.x, position.y);
        }
      });
      context.stroke();
    }

    context.restore();
  }

  function drawStars() {
    const visiblePositions = state.positions.filter((entry) => matchesVisibility(entry.star));
    const generatedPositions = visiblePositions.filter((entry) => entry.star.type === "generated");
    const catalogPositions = visiblePositions.filter((entry) => entry.star.type === "catalog");
    const anchorPositions = visiblePositions.filter((entry) => entry.star.type === "anchor");

    const drawStar = (entry) => {
      const { star, x, y, radius } = entry;
      const selected = star.id === state.selectedStarId;
      const selectedBoost = star.type === "catalog" ? 1.4 : star.type === "generated" ? 0.9 : 2.6;
      const size = selected ? radius + selectedBoost : radius;
      const opacity = getStarOpacity(star, selected);

      context.save();
      context.beginPath();
      context.fillStyle = getFillStyle(star, opacity);
      context.shadowColor = selected
        ? "rgba(125, 220, 255, 0.65)"
        : star.type === "catalog"
          ? "rgba(161, 140, 255, 0.18)"
          : star.type === "generated"
            ? "rgba(161, 140, 255, 0.14)"
          : "rgba(143, 255, 230, 0.25)";
      context.shadowBlur = selected ? 18 : star.type === "catalog" ? 4 : star.type === "generated" ? 2 : 10;
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fill();

      if (selected) {
        context.beginPath();
        context.lineWidth = 1.4;
        context.strokeStyle = star.type === "generated" ? "rgba(161, 140, 255, 0.7)" : "rgba(125, 220, 255, 0.72)";
        context.arc(x, y, size + 6, 0, Math.PI * 2);
        context.stroke();
      }

      context.restore();
    };

    for (const entry of catalogPositions) {
      drawStar(entry);
    }

    for (const entry of generatedPositions) {
      drawStar(entry);
    }

    for (const entry of anchorPositions) {
      drawStar(entry);
    }
  }

  function redraw() {
    if (!state.width || !state.height) {
      resizeCanvas();
    }

    buildPositions();
    drawBackground();
    drawConstellations();
    drawStars();
  }

  function pickStar(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let closest = null;
    let distance = Number.POSITIVE_INFINITY;

    for (const entry of state.positions) {
      if (!matchesVisibility(entry.star)) {
        continue;
      }
      const deltaX = entry.x - x;
      const deltaY = entry.y - y;
      const currentDistance = Math.hypot(deltaX, deltaY);
      if (currentDistance < distance) {
        distance = currentDistance;
        closest = entry.star;
      }
    }

    if (closest && distance <= 16) {
      return closest;
    }

    return null;
  }

  function handlePointerDown(event) {
    const star = pickStar(event.clientX, event.clientY);
    if (!star) {
      return;
    }
    state.selectedStarId = star.id;
    redraw();
    if (typeof onSelect === "function") {
      onSelect(star);
    }
  }

  function handlePointerMove(event) {
    const star = pickStar(event.clientX, event.clientY);
    canvas.style.cursor = star ? "pointer" : "default";
  }

  function handlePointerLeave() {
    canvas.style.cursor = "default";
  }

  resizeCanvas();
  redraw();

  const resizeTarget = canvas.parentElement || canvas;
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    resizeCanvas();
    redraw();
  }) : null;

  if (observer) {
    observer.observe(resizeTarget);
  } else {
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("resize", redraw);
  }

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerleave", handlePointerLeave);

  if (selectedStarId && starById.has(selectedStarId)) {
    const initial = starById.get(selectedStarId);
    if (typeof onSelect === "function") {
      onSelect(initial);
    }
  }

  return {
    redraw,
    setCatalogEnabled(nextEnabled) {
      state.catalogEnabled = Boolean(nextEnabled);
      redraw();
    },
    setGeneratedEnabled(nextEnabled) {
      state.generatedEnabled = Boolean(nextEnabled);
      redraw();
    },
    setVisibility(nextVisibility = {}) {
      state.visibility = {
        anchor: nextVisibility.anchor !== false,
        catalog: Boolean(nextVisibility.catalog),
        generated: Boolean(nextVisibility.generated),
        maxDistanceLy: typeof nextVisibility.maxDistanceLy === "number" ? nextVisibility.maxDistanceLy : Number.POSITIVE_INFINITY,
        maxMagnitude: typeof nextVisibility.maxMagnitude === "number" ? nextVisibility.maxMagnitude : Number.POSITIVE_INFINITY,
      };
      redraw();
    },
    setSelectedStarId(nextSelectedStarId) {
      state.selectedStarId = nextSelectedStarId;
      redraw();
    },
    destroy() {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      if (observer) {
        observer.disconnect();
      } else {
        window.removeEventListener("resize", resizeCanvas);
        window.removeEventListener("resize", redraw);
      }
    },
  };
}
