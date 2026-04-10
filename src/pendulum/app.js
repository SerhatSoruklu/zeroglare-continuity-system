const { createElement: h, useLayoutEffect } = React;

import { numberToWords } from "../shared/scale.js";
import { useParityPendulumState } from "./hooks/useParityPendulumState.js";
import { ArchitectureNote } from "./components/ArchitectureNote.js";
import { EnginePanel } from "./components/EnginePanel.js";
import { LabPanel } from "./components/LabPanel.js";
import { ModeSelector } from "./components/ModeSelector.js";
import { PressurePanel } from "./components/PressurePanel.js";
import { ScaleMilestones } from "./components/ScaleMilestones.js";
import { StatGrid } from "./components/StatGrid.js";
import { TextEditorPanel } from "./components/TextEditorPanel.js";
import { VisualCore } from "./components/VisualCore.js";
import { Badge } from "./components/Badge.js";

export function App() {
  const state = useParityPendulumState();
  const {
    mode,
    setMode,
    modeConfig,
    engineLength,
    labCount,
    activeCount,
    countWord,
    parity,
    activeBand,
    pressureSourceLabel,
    forbiddenHit,
    countWordHit,
    solved,
    renderPressure,
    enginePressure,
    boundaryPressure,
    previewWords,
    formatterChecks,
    text,
    setText,
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
    labEnabled,
    setLabEnabled,
    labCountRaw,
    setLabCountRaw,
  } = state;

  useLayoutEffect(() => {
    document.title = `Parity Pendulum | ${modeConfig.label}`;
  }, [modeConfig.label]);

  useLayoutEffect(() => {
    window.__PARITY_PENDULUM_SET_MODE__ = setMode;
    return () => {
      if (window.__PARITY_PENDULUM_SET_MODE__ === setMode) {
        window.__PARITY_PENDULUM_SET_MODE__ = null;
      }
    };
  }, [setMode]);

  return h(
    "main",
    { className: "app-shell" },
    h(
      "section",
      { className: "hero", "aria-labelledby": "pendulum-hero-title" },
      h(
        "div",
        { className: "hero-copy" },
        h("p", { className: "eyebrow" }, "Parity Pendulum"),
        h("h1", { id: "pendulum-hero-title" }, "Separate render scaling from logic scaling"),
        h(
          "p",
          { className: "lead" },
          "Safe and unsafe still use the textarea path. Engine mode moves the big number into an engine-state model so we can test logical scale without a giant live surface becoming the bottleneck.",
        ),
        h(ModeSelector, { mode, setMode }),
        h(StatGrid, {
          mode,
          sourceLabel: pressureSourceLabel,
          activeCount,
          countWord,
          parity,
          solved,
          bandLabel: `Band: ${activeBand.label}`,
        }),
      ),
      h(
        "div",
        { className: "visual-wrap" },
        h(VisualCore, {
          mode,
          sourceLabel: pressureSourceLabel,
          activeCount,
          countWord,
          parity,
          solved,
          forbiddenHit,
          bandLabel: activeBand.label,
        }),
      ),
    ),
    h(
      "section",
      { className: "section", id: "workspace", "aria-labelledby": "pendulum-workspace-title" },
      h(
        "div",
        { className: "section-head" },
        h("p", { className: "eyebrow" }, "Workspace"),
        h("h2", { id: "pendulum-workspace-title" }, "Mode-aware surface with a real engine path"),
        h(
          "p",
          null,
          "The editor stays render-bound in safe and unsafe. Engine mode switches to symbolic length, preview-only text, and manual or derived constraint signals.",
        ),
      ),
      h(
        "div",
        { className: "workspace-grid" },
        h(
          "div",
          { className: "workspace-stack" },
          mode === "engine"
            ? h(EnginePanel, {
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
                virtualCountWord: previewWords,
                activeCount: engineLength,
                parity,
                solved,
              })
            : h(TextEditorPanel, {
                mode,
                text,
                setText,
                cap: modeConfig.cap,
                activeCount,
                countWord,
                parity,
                forbiddenHit,
                countWordHit,
                solved,
                labEnabled,
              }),
        ),
        h(
          "div",
          { className: "workspace-stack" },
          h(PressurePanel, {
            mode,
            pressureSourceLabel,
            renderPressure,
            enginePressure,
            boundaryPressure,
          }),
          mode === "engine"
            ? h(ScaleMilestones, {
                activeCount: engineLength,
                onJump: (value) => setEngineLengthRaw(value.toString()),
              })
            : null,
          h(
            "div",
            { className: "card meter-card" },
            h(
              "div",
              { className: "section-head" },
              h("p", { className: "eyebrow" }, "Logic readout"),
              h("h2", null, "Parity, forbidden letter, count word"),
              h("p", null, "These status cards stay the same across modes. Only the source path changes."),
            ),
            h(
              "div",
              { className: "status-grid" },
              h(
                "article",
                { className: "status-card" },
                h("span", null, "Parity"),
                h("strong", null, parity.toUpperCase()),
                h("small", null, "Even counts read as solved-friendly in this setup."),
              ),
              h(
                "article",
                { className: "status-card" },
                h("span", null, "Forbidden letter"),
                h("strong", null, forbiddenHit ? `Present: x` : `Clear: x`),
                h("small", null, "Safe and unsafe inspect the live textarea. Engine uses overrides or preview-derived signals."),
              ),
              h(
                "article",
                { className: "status-card" },
                h("span", null, "Count word"),
                h("strong", null, countWordHit ? "Present" : "Absent"),
                h("small", null, countWord),
              ),
              h(
                "article",
                { className: "status-card" },
                h("span", null, "Solved"),
                h("strong", null, solved ? "PASS" : "FAIL"),
                h("small", null, "Solved means even parity, no forbidden letter, and the count word present."),
              ),
            ),
          ),
          h(ArchitectureNote),
        ),
      ),
    ),
    h(
      "section",
      { className: "section", id: "lab", "aria-labelledby": "pendulum-lab-title" },
      h(
        "div",
        { className: "section-head" },
        h("p", { className: "eyebrow" }, "Large-count lab"),
        h("h2", { id: "pendulum-lab-title" }, "Direct count override for formatter and logic checks"),
        h(
          "p",
          null,
          "This lab exists to keep a separate direct-count path available. It can stay idle, or it can drive the main count without inflating the textarea.",
        ),
      ),
      h(LabPanel, {
        labEnabled,
        setLabEnabled,
        labCountRaw,
        setLabCountRaw,
        labCount,
        labWords: numberToWords(labCount),
        labParity: labCount % 2n === 0n ? "even" : "odd",
      }),
    ),
    h(
      "section",
      { className: "section", id: "formatter", "aria-labelledby": "pendulum-formatter-title" },
      h(
        "div",
        { className: "section-head" },
        h("p", { className: "eyebrow" }, "Formatter"),
        h("h2", { id: "pendulum-formatter-title" }, "Large-scale checks stay visible"),
        h(
          "p",
          null,
          "The app keeps a lightweight internal sanity row so the large-scale formatter path stays explicit after the engine refactor.",
        ),
      ),
      h(
        "div",
        { className: "card formatter-card" },
        h(
          "div",
          { className: "check-summary" },
          h(Badge, { tone: formatterChecks.every((check) => check.pass) ? "good" : "bad" }, formatterChecks.every((check) => check.pass) ? `All ${formatterChecks.length} formatter checks pass` : "Formatter checks failed"),
          h(Badge, { tone: "info" }, "numberToWords supports real and generated scales"),
        ),
        h(
          "div",
          { className: "check-list" },
          formatterChecks.map((check) =>
            h(
              "div",
              { key: check.label, className: "check-row" },
              h(
                "div",
                null,
                h("strong", null, `${check.label} · ${check.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`),
                h("small", null, check.actual),
              ),
              h(Badge, { tone: check.pass ? "good" : "bad" }, check.pass ? "PASS" : "FAIL"),
            ),
          ),
        ),
      ),
    ),
    h(
      "footer",
      { className: "footer" },
      h("span", null, "Coupyn Labs."),
      h("span", null, "Parity Pendulum"),
      h("span", null, "Safe, unsafe, engine, and lab symbolic"),
    ),
  );
}
