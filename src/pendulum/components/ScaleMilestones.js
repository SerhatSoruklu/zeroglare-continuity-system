const { createElement: h } = React;

import { SCALE_MILESTONES } from "../../shared/constants.js";
import { getDominantScaleDescriptor } from "../../shared/scale.js";
import { getScaleBand } from "../../shared/pressure.js";
import { cx, truncateLabel } from "../../shared/text.js";
import { Badge } from "./Badge.js";

export function ScaleMilestones({ activeCount, onJump }) {
  const activeBand = getScaleBand(activeCount);
  const dominantScale = getDominantScaleDescriptor(activeCount);
  const displayDominantScale = truncateLabel(dominantScale.label, 24);
  return h(
    "div",
    { className: "card meter-card" },
    h(
      "div",
      { className: "section-head" },
      h("p", { className: "eyebrow" }, "Scale milestones"),
      h("h2", null, "Count bands and boundary-aware naming"),
      h("p", null, "Engine Mode shows verified real names first, labels helpers explicitly, and stops cleanly at the supported boundary."),
    ),
    h(
      "div",
      { className: "check-summary", style: { marginBottom: "14px" } },
      h(Badge, { tone: dominantScale.type === "real" ? "good" : dominantScale.type === "generated" ? "warn" : "bad" }, `Dominant scale: ${displayDominantScale}`),
      h(Badge, { tone: dominantScale.sourceLabel === "verified real table" ? "good" : dominantScale.sourceLabel === "generated helper" ? "warn" : "bad" }, `Scale source: ${dominantScale.sourceLabel}`),
      h(Badge, { tone: dominantScale.boundaryStatus === "highest supported real entry" ? "warn" : dominantScale.boundaryStatus === "outside supported boundary" ? "bad" : "info" }, `Boundary status: ${dominantScale.boundaryStatus}`),
    ),
    h(
      "div",
      { className: "chip-row", style: { marginBottom: "14px" } },
      SCALE_MILESTONES.map((band) =>
        h(
          "span",
          { key: band.label, className: cx("chip", activeCount >= band.value && "is-active") },
          band.label,
        ),
      ),
    ),
    h(
      "div",
      { className: "milestone-row" },
      SCALE_MILESTONES.map((band) =>
        h(
          "button",
          {
            key: band.label,
            type: "button",
            className: cx("milestone", activeBand.label === band.label && "is-active"),
            onClick: () => onJump(band.value),
          },
          h("span", null, band.label),
          h("strong", null, band.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")),
        ),
      ),
    ),
  );
}
