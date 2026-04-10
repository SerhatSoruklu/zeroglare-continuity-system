const { createElement: h } = React;

import { Badge } from "./Badge.js";
import { truncateLabel } from "../../shared/text.js";

export function LabPanel({ labEnabled, setLabEnabled, labCountRaw, setLabCountRaw, labCount, labWords, labParity }) {
  const displayLabWords = truncateLabel(labWords, 28);
  return h(
    "div",
    { className: "card lab-card" },
    h(
      "div",
      { className: "section-head" },
      h("p", { className: "eyebrow" }, "Large-count lab"),
      h("h2", null, "Direct count override"),
      h("p", null, "This lab keeps count, parity, and word formatting independent from the textarea. It is the clean direct-count path."),
    ),
    h(
      "div",
      { className: "toolbar", style: { marginBottom: "14px" } },
      h(
        "button",
        {
          type: "button",
          className: labEnabled ? "segment is-active" : "segment",
          onClick: () => setLabEnabled((value) => !value),
          "aria-pressed": labEnabled,
        },
        labEnabled ? "Using lab count" : "Use lab count in main logic",
      ),
      h(Badge, { tone: labEnabled ? "warn" : "info" }, labEnabled ? "Lab symbolic" : "Lab idle"),
    ),
    h(
      "div",
      { className: "field-grid" },
      h(
        "div",
        { className: "field" },
        h("div", { className: "field-head" }, h("span", { className: "field-label" }, "Lab count"), h("span", { className: "field-hint" }, "Direct count override, no giant string required.")),
        h("input", {
          className: "input",
          type: "text",
          inputMode: "numeric",
          value: labCountRaw,
          onChange: (event) => setLabCountRaw(event.target.value.replace(/[^\d]/g, "")),
          placeholder: "1000000",
        }),
      ),
      h(
        "div",
        { className: "status-grid" },
        h(
          "article",
          { className: "status-card" },
          h("span", null, "Lab count word"),
          h("strong", { title: labWords }, displayLabWords),
          h("small", null, "Formatter-backed direct count override."),
        ),
        h(
          "article",
          { className: "status-card" },
          h("span", null, "Lab parity"),
          h("strong", null, labParity.toUpperCase()),
          h("small", null, labEnabled ? "This value can drive the main logic path." : "This value is visible but not active."),
        ),
      ),
    ),
  );
}
