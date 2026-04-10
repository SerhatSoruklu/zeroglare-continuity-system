const { createElement: h } = React;

export function ArchitectureNote() {
  return h(
    "div",
    { className: "note-card" },
    h("div", { className: "section-head", style: { marginBottom: "12px" } }, h("p", { className: "eyebrow" }, "Architecture honesty"), h("h2", null, "Three layers, kept separate")),
    h(
      "p",
      null,
      "Safe and unsafe are render-bound. Engine mode is logic-bound and symbolic, with no giant live textarea. Large-count lab is a direct count override for formatter and logic checks.",
    ),
  );
}
