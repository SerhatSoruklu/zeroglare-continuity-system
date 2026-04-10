const { createElement: h } = React;

import { FORBIDDEN_LETTER, MODE_CONFIG } from "../../shared/constants.js";
import { formatBigInt } from "../../shared/formatting.js";
import { truncateLabel } from "../../shared/text.js";
import { Badge } from "./Badge.js";

export function VisualCore({ mode, sourceLabel, activeCount, countWord, parity, solved, forbiddenHit, bandLabel }) {
  const shortCountWord = truncateLabel(countWord, 22);
  const sourceTone =
    sourceLabel === "Engine-bound"
      ? "warn"
      : sourceLabel === "Boundary-limited"
        ? "bad"
        : sourceLabel === "Symbolic override"
          ? "info"
          : "good";
  return h(
    "div",
    { className: "visual-card" },
    h(
      "div",
      { className: "visual-caption" },
      h("span", null, "Inspect the signal"),
      h("strong", null, `${MODE_CONFIG[mode].label} core`),
    ),
    h(
      "div",
      { className: "core", "aria-hidden": "true" },
      h("div", { className: "orb" }),
      h("div", { className: "ring ring-one" }),
      h("div", { className: "ring ring-two" }),
      h("div", { className: "ring ring-three" }),
      h("div", { className: "node", "data-tone": "memory", style: { "--x": "-118px", "--y": "-56px", "--z": "38px" } }, `Count ${truncateLabel(formatBigInt(activeCount), 16)}`),
      h("div", { className: "node", "data-tone": "relay", style: { "--x": "104px", "--y": "-76px", "--z": "-10px" } }, `Word ${shortCountWord}`),
      h("div", { className: "node", "data-tone": "shield", style: { "--x": "-146px", "--y": "28px", "--z": "-6px" } }, `Parity ${parity}`),
      h("div", { className: "node", "data-tone": "gate", style: { "--x": "124px", "--y": "40px", "--z": "24px" } }, solved ? "Solved" : "Open"),
      h("div", { className: "node", "data-tone": "scan", style: { "--x": "-34px", "--y": "-146px", "--z": "5px" } }, forbiddenHit ? `Forbidden ${FORBIDDEN_LETTER}` : "Forbidden clear"),
      h("div", { className: "node", "data-tone": "archive", style: { "--x": "8px", "--y": "140px", "--z": "-12px" } }, bandLabel),
      h("div", { className: "node", "data-tone": "orbit", style: { "--x": "150px", "--y": "116px", "--z": "-8px" } }, sourceLabel),
      h("div", { className: "node", "data-tone": "seal", style: { "--x": "-136px", "--y": "110px", "--z": "18px" } }, `Mode ${MODE_CONFIG[mode].label}`),
      h(
        "div",
        { className: "core-label" },
        h("span", null, "Symbolic core"),
        h("strong", null, `${formatBigInt(activeCount)} chars · ${shortCountWord}`),
        h("small", null, `${sourceLabel} · ${solved ? "Solved path" : "Open path"} · forbidden ${FORBIDDEN_LETTER}: ${forbiddenHit ? "present" : "clear"}`),
      ),
    ),
    h(
      "div",
      { className: "chip-row", style: { marginTop: "14px", justifyContent: "center" } },
      h(Badge, { tone: sourceTone }, sourceLabel),
      h(Badge, { tone: parity === "even" ? "good" : "warn" }, `Parity ${parity}`),
      h(Badge, { tone: solved ? "good" : "warn" }, solved ? "Solved" : "Not solved"),
    ),
  );
}
