const { createElement: h } = React;

export function Badge({ tone = "info", children }) {
  return h("span", { className: "badge", "data-tone": tone }, children);
}
