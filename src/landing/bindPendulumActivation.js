import { getPendulumActivationElements } from "../dom/selectors.js";

export function bindPendulumActivation(doc = document) {
  const { button, core, root, workspace } = getPendulumActivationElements(doc);
  if (!button || !core) {
    return () => {};
  }

  let resetTimer = null;

  const handleClick = (event) => {
    event.preventDefault();

    if (root) {
      root.classList.add("is-visible");
    }

    doc.body.classList.add("engine-mode");

    if (typeof window.__PARITY_PENDULUM_SET_MODE__ === "function") {
      window.__PARITY_PENDULUM_SET_MODE__("engine");
    }

    button.classList.add("is-active");
    core.classList.add("is-pulsing");

    window.requestAnimationFrame(() => {
      if (workspace) {
        workspace.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (root) {
        root.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    if (resetTimer) {
      window.clearTimeout(resetTimer);
    }

    resetTimer = window.setTimeout(() => {
      button.classList.remove("is-active");
      core.classList.remove("is-pulsing");
    }, 900);
  };

  button.addEventListener("click", handleClick);

  return () => {
    button.removeEventListener("click", handleClick);
    if (resetTimer) {
      window.clearTimeout(resetTimer);
      resetTimer = null;
    }
  };
}
