const { createElement: h } = React;

import { FORBIDDEN_LETTER, QUICK_LENGTHS } from "../../shared/constants.js";
import { formatBigInt } from "../../shared/formatting.js";
import { getDominantScaleDescriptor, numberToWords } from "../../shared/scale.js";
import { truncateLabel } from "../../shared/text.js";
import { Segmented } from "./Segmented.js";

export function EnginePanel({
  engineLengthRaw,
  setEngineLengthRaw,
  enginePrefix,
  setEnginePrefix,
  engineSeed,
  setEngineSeed,
  engineSuffix,
  setEngineSuffix,
  engineStrategy,
  setEngineStrategy,
  containsForbiddenOverride,
  setContainsForbiddenOverride,
  containsCountOverride,
  setContainsCountOverride,
  virtualCountWord,
  activeCount,
  parity,
  solved,
}) {
  const previewSurface = [enginePrefix, engineSeed, engineSuffix].filter(Boolean).join(" ").trim();
  const previewText = previewSurface || " ";
  const dominantScale = getDominantScaleDescriptor(activeCount);
  const digitCount = activeCount.toString().length;
  const displayDominantScale = truncateLabel(dominantScale.label, 28);
  const compactLengthSummary = `${displayDominantScale} · ${digitCount} digits`;

  return h(
    "div",
    { className: "card control-card" },
    h(
      "div",
      { className: "section-head" },
      h("p", { className: "eyebrow" }, "Symbolic engine"),
      h("h2", null, "Engine Mode"),
      h(
        "p",
        null,
        "Engine mode does not store or render a giant textarea. It runs the parity logic from a structured engine-state model and only previews a small prefix and suffix.",
      ),
    ),
    h(
      "div",
      { className: "field-grid" },
      h(
        "div",
        { className: "field" },
        h(
          "div",
          { className: "field-head" },
          h("span", { className: "field-label" }, "Virtual length"),
          h("span", { className: "field-hint", title: `${numberToWords(activeCount)} · ${formatBigInt(activeCount)} chars` }, compactLengthSummary),
        ),
        h("input", {
          className: "input",
          type: "text",
          inputMode: "numeric",
          value: engineLengthRaw,
          onChange: (event) => setEngineLengthRaw(event.target.value.replace(/[^\d]/g, "")),
          placeholder: "1000000",
        }),
        h(
          "div",
          { className: "quick-buttons" },
          QUICK_LENGTHS.map((value) =>
            h(
              "button",
              {
                key: value.toString(),
                type: "button",
                className: "quick-button",
                onClick: () => setEngineLengthRaw(value.toString()),
              },
              formatBigInt(value),
            ),
          ),
        ),
      ),
      h(
        "div",
        { className: "status-grid" },
        h(
          "article",
          { className: "status-card" },
          h("span", null, "Strategy"),
          h("strong", null, engineStrategy === "manual" ? "Manual overrides" : "Derived approximation"),
          h(
            "small",
            null,
            engineStrategy === "manual"
              ? "Manual mode is deterministic. Auto states can still fall back to preview-derived values."
              : "Derived mode inspects only the preview surface and is explicitly approximate.",
          ),
        ),
        h(
          "article",
          { className: "status-card" },
          h("span", null, "Surface"),
          h("strong", null, `${formatBigInt(BigInt(previewText.length))} chars`),
          h("small", null, "Preview text is bounded and never becomes the primary storage path."),
        ),
        h(
          "article",
          { className: "status-card" },
          h("span", null, "Dominant scale"),
          h("strong", { title: dominantScale.label }, displayDominantScale),
          h("small", null, `Scale source: ${dominantScale.sourceLabel}`),
          h("small", null, `Boundary status: ${dominantScale.boundaryStatus}`),
        ),
      ),
      h(
        "div",
        { className: "field-grid" },
        h(
          "div",
          { className: "field" },
          h("div", { className: "field-head" }, h("span", { className: "field-label" }, "Engine strategy"), h("span", { className: "field-hint" }, "Manual first, derived when you want approximation.")),
          h(Segmented, {
            ariaLabel: "Engine strategy",
            value: engineStrategy,
            onChange: setEngineStrategy,
            options: [
              { value: "manual", label: "Manual", detail: "deterministic" },
              { value: "derived", label: "Derived", detail: "approximate" },
            ],
          }),
        ),
        h(
          "div",
          { className: "field-grid" },
          h(
            "div",
            { className: "field" },
            h("div", { className: "field-head" }, h("span", { className: "field-label" }, "Prefix preview"), h("span", { className: "field-hint" }, "Small visible prefix only.")),
            h("input", {
              className: "input",
              type: "text",
              value: enginePrefix,
              onChange: (event) => setEnginePrefix(event.target.value),
              maxLength: 80,
              placeholder: "prefix",
            }),
          ),
          h(
            "div",
            { className: "field" },
            h("div", { className: "field-head" }, h("span", { className: "field-label" }, "Seed text"), h("span", { className: "field-hint" }, "The engine can inspect this seed, not a giant body.")),
            h("input", {
              className: "input",
              type: "text",
              value: engineSeed,
              onChange: (event) => setEngineSeed(event.target.value),
              maxLength: 120,
              placeholder: "seed text",
            }),
          ),
          h(
            "div",
            { className: "field" },
            h("div", { className: "field-head" }, h("span", { className: "field-label" }, "Suffix preview"), h("span", { className: "field-hint" }, "Small visible suffix only.")),
            h("input", {
              className: "input",
              type: "text",
              value: engineSuffix,
              onChange: (event) => setEngineSuffix(event.target.value),
              maxLength: 80,
              placeholder: "suffix",
            }),
          ),
        ),
      ),
      h(
        "div",
        { className: "field-grid" },
        h(
          "div",
          { className: "field" },
          h("div", { className: "field-head" }, h("span", { className: "field-label" }, "Contains forbidden letter"), h("span", { className: "field-hint" }, `Manual override or preview-derived (${FORBIDDEN_LETTER}).`)),
          h(Segmented, {
            ariaLabel: "Forbidden letter override",
            value: containsForbiddenOverride,
            onChange: setContainsForbiddenOverride,
            options: [
              { value: null, label: "Auto", detail: "preview" },
              { value: true, label: "Yes", detail: "force true" },
              { value: false, label: "No", detail: "force false" },
            ],
          }),
        ),
        h(
          "div",
          { className: "field" },
          h("div", { className: "field-head" }, h("span", { className: "field-label" }, "Contains count word"), h("span", { className: "field-hint" }, "Manual override or preview-derived count word.")),
          h(Segmented, {
            ariaLabel: "Count word override",
            value: containsCountOverride,
            onChange: setContainsCountOverride,
            options: [
              { value: null, label: "Auto", detail: "preview" },
              { value: true, label: "Yes", detail: "force true" },
              { value: false, label: "No", detail: "force false" },
            ],
          }),
        ),
      ),
      h(
        "div",
        { className: "card formatter-card", style: { padding: "18px" } },
        h(
          "div",
          { className: "field-head" },
          h("span", { className: "field-label" }, "Rendered preview"),
          h("span", { className: "field-hint" }, "Only a small surface is shown."),
        ),
        h(
          "pre",
          { className: "preview-window" },
          `prefix: ${enginePrefix || "∅"}\nseed: ${engineSeed || "∅"}\nsuffix: ${engineSuffix || "∅"}\n\nsurface: ${previewText}\n\nlogical scale: ${displayDominantScale}\ndigits: ${digitCount}\ncount word: ${truncateLabel(virtualCountWord, 40)}\nparity: ${parity}\nsolved: ${solved ? "yes" : "no"}`,
        ),
      ),
    ),
  );
}
