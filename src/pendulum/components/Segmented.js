const { createElement: h } = React;

import { cx } from "../../shared/text.js";

export function Segmented({ value, options, onChange, ariaLabel }) {
  return h(
    "div",
    { className: "segmented", role: "group", "aria-label": ariaLabel },
    options.map((option) =>
      h(
        "button",
        {
          key: String(option.value),
          type: "button",
          className: cx("segment", Object.is(option.value, value) && "is-active"),
          onClick: () => onChange(option.value),
          "aria-pressed": Object.is(option.value, value),
        },
        option.label,
        option.detail ? h("small", null, option.detail) : null,
      ),
    ),
  );
}
