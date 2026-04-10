const { createElement: h } = React;

import { FORBIDDEN_LETTER, MODE_CONFIG } from "../../shared/constants.js";
import { formatBigInt } from "../../shared/formatting.js";
import { numberToWords } from "../../shared/scale.js";
import { Badge } from "./Badge.js";

export function TextEditorPanel({ mode, text, setText, cap, activeCount, countWord, parity, forbiddenHit, countWordHit, solved, labEnabled }) {
  return h(
    "div",
    { className: "card control-card" },
    h(
      "div",
      { className: "section-head" },
      h("p", { className: "eyebrow" }, "Render-bound input"),
      h("h2", null, `${MODE_CONFIG[mode].label} textarea`),
      h(
        "p",
        null,
        "Safe and unsafe modes keep the live textarea as the source of truth. Caps stay fixed so we can still test render pressure directly.",
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
          h("span", { className: "field-label" }, "Live text"),
          h("span", { className: "field-hint" }, `${formatBigInt(BigInt(text.length))} / ${formatBigInt(cap)} chars`),
        ),
        h("textarea", {
          className: "textarea",
          value: text,
          maxLength: Number(cap),
          onChange: (event) => setText(event.target.value),
          spellCheck: false,
          autoCapitalize: "off",
          autoCorrect: "off",
          placeholder: "Type a live body here for render-bound modes.",
        }),
      ),
      h(
        "div",
        { className: "chip-row" },
        h(Badge, { tone: "info" }, `Count word: ${countWord}`),
        h(Badge, { tone: forbiddenHit ? "bad" : "good" }, `Forbidden ${FORBIDDEN_LETTER}: ${forbiddenHit ? "present" : "clear"}`),
        h(Badge, { tone: parity === "even" ? "good" : "warn" }, `Parity: ${parity}`),
        h(Badge, { tone: solved ? "good" : "warn" }, solved ? "Solved" : "Not solved"),
        labEnabled ? h(Badge, { tone: "warn" }, "Lab override active") : null,
      ),
      h(
        "div",
        { className: "status-grid" },
        h(
          "article",
          { className: "status-card" },
          h("span", null, "Effective count"),
          h("strong", null, `${formatBigInt(activeCount)} chars`),
          h("small", null, numberToWords(activeCount)),
        ),
        h(
          "article",
          { className: "status-card" },
          h("span", null, "Count word"),
          h("strong", null, countWord),
          h("small", null, countWordHit ? "PASS: count word is present." : "FAIL: count word is absent."),
        ),
      ),
    ),
  );
}
