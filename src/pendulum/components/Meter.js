const { createElement: h } = React;

export function Meter({ label, value, tone, detail }) {
  const displayValue = Number.isFinite(value) ? value.toFixed(1) : "0.0";
  return h(
    "div",
    { className: "meter", "data-tone": tone },
    h(
      "div",
      { className: "meter-head" },
      h("span", null, label),
      h("strong", null, `${displayValue}%`),
    ),
    h("div", { className: "meter-track" }, h("span", { className: "meter-fill", style: { width: `${displayValue}%` } })),
    h("small", null, detail),
  );
}
