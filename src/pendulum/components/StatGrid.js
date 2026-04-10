const { createElement: h } = React;

import { MODE_CONFIG } from "../../shared/constants.js";
import { formatBigInt } from "../../shared/formatting.js";
import { truncateLabel } from "../../shared/text.js";

export function StatGrid({ mode, sourceLabel, activeCount, countWord, parity, solved, bandLabel }) {
  const displayCount = truncateLabel(formatBigInt(activeCount), 20);
  const displayCountWord = truncateLabel(countWord, 24);
  return h(
    "div",
    { className: "stats", "aria-label": "System highlights" },
    h(
      "article",
      { className: "stat" },
      h("span", null, "Mode"),
      h("strong", null, MODE_CONFIG[mode].label),
      h("small", null, MODE_CONFIG[mode].detail),
    ),
    h(
      "article",
      { className: "stat" },
      h("span", null, "Source"),
      h("strong", null, sourceLabel),
      h("small", null, "Render-bound, engine-bound, symbolic override, or boundary-limited."),
    ),
    h(
      "article",
      { className: "stat" },
      h("span", null, "Effective count"),
      h(
        "strong",
        {
          className: "count-readout",
          title: `${formatBigInt(activeCount)} chars`,
        },
        `${displayCount} chars`,
      ),
      h("small", { title: countWord }, displayCountWord),
    ),
    h(
      "article",
      { className: "stat" },
      h("span", null, "Parity / solve"),
      h("strong", null, `${parity.toUpperCase()} · ${solved ? "Solved" : "Open"}`),
      h("small", null, bandLabel),
    ),
  );
}
