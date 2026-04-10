const { createElement: h } = React;

import { Badge } from "./Badge.js";
import { Meter } from "./Meter.js";

export function PressurePanel({ mode, pressureSourceLabel, renderPressure, enginePressure, boundaryPressure }) {
  const renderTone = renderPressure > 75 ? "warn" : "good";
  const engineTone = enginePressure > 75 ? "warn" : "good";
  const boundaryTone = boundaryPressure >= 100 ? "bad" : boundaryPressure >= 70 ? "warn" : "info";
  return h(
    "div",
    { className: "card meter-card" },
    h(
      "div",
      { className: "section-head" },
      h("p", { className: "eyebrow" }, "Stress meter"),
      h("h2", null, "Render, engine, and boundary pressure"),
      h("p", null, "Safe and unsafe stay render-bound. Engine mode shifts pressure to the logical model. Boundary pressure shows how close the scale is to the verified ceiling."),
    ),
    h(
      "div",
      { className: "chip-row", style: { marginBottom: "14px" } },
      h(Badge, { tone: "info" }, pressureSourceLabel),
      h(Badge, { tone: renderTone }, renderPressure > 75 ? "High render pressure" : "Render pressure steady"),
      h(Badge, { tone: engineTone }, enginePressure > 75 ? "High engine pressure" : "Engine pressure steady"),
      h(Badge, { tone: boundaryTone }, boundaryPressure >= 100 ? "Boundary critical" : boundaryPressure >= 70 ? "Boundary elevated" : "Boundary steady"),
    ),
    h(
      "div",
      { className: "meter-grid" },
      h(Meter, {
        label: "Render pressure",
        value: renderPressure,
        tone: renderTone,
        detail: mode === "engine" ? "This reflects preview surface cost in symbolic mode." : "This reflects the visible surface: textarea plus live checks.",
      }),
      h(Meter, {
        label: "Engine pressure",
        value: enginePressure,
        tone: engineTone,
        detail: mode === "engine" ? "This reflects logical scale, strategy, and preview analysis." : "Inactive in render-bound modes.",
      }),
      h(Meter, {
        label: "Boundary pressure",
        value: boundaryPressure,
        tone: boundaryTone,
        detail:
          boundaryPressure >= 100
            ? "Outside the verified real scale table."
            : boundaryPressure >= 70
              ? "At the highest supported real entry."
              : "Within the verified real table.",
      }),
    ),
  );
}
