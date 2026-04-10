const { createElement: h } = React;

import { MODE_CONFIG } from "../../shared/constants.js";
import { cx } from "../../shared/text.js";

export function ModeSelector({ mode, setMode }) {
  const items = Object.entries(MODE_CONFIG).map(([key, config]) => ({
    key,
    label: config.label,
    detail: config.detail,
  }));

  return h(
    "div",
    { className: "mode-switcher", role: "tablist", "aria-label": "Mode selector" },
    items.map((item) =>
      h(
        "button",
        {
          key: item.key,
          type: "button",
          className: cx("mode-pill", mode === item.key && "is-active"),
          onClick: () => setMode(item.key),
          "aria-pressed": mode === item.key,
        },
        h("strong", null, item.label),
        h("small", null, item.detail),
      ),
    ),
  );
}
