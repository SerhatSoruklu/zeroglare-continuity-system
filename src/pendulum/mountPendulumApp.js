const { createElement: h } = React;

import { App } from "./app.js";

export function mountPendulumApp(root = document.getElementById("root")) {
  if (!root) {
    return null;
  }

  if (root.__pendulumReactRoot) {
    return root.__pendulumReactRoot;
  }

  const reactRoot = ReactDOM.createRoot(root);
  reactRoot.render(h(App));
  root.__pendulumReactRoot = reactRoot;
  return reactRoot;
}
