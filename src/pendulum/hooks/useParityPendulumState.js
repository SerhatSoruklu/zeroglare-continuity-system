import {
  ENGINE_HARD_STOP,
  FORMATTER_SAMPLES,
  FORBIDDEN_LETTER,
  MODE_CONFIG,
  SCALE_MAX,
} from "../../shared/constants.js";
import { clampBigInt, parseBigIntInput } from "../../shared/formatting.js";
import { containsLetter, containsWord } from "../../shared/text.js";
import {
  getDominantScaleDescriptor,
  numberToWords,
} from "../../shared/scale.js";
import {
  getPressureSourceLabel,
  getScaleBand,
  pressureFromBoundary,
  pressureFromEngineState,
  pressureFromLength,
} from "../../shared/pressure.js";
import { resolveTriState } from "../../shared/state.js";

const { useEffect, useMemo, useState } = React;

export function useParityPendulumState() {
  const [mode, setMode] = useState("safe");
  const [text, setText] = useState("Parity Pendulum keeps render and logic separate.");
  const [engineLengthRaw, setEngineLengthRaw] = useState("1000000");
  const [enginePrefix, setEnginePrefix] = useState("symbolic");
  const [engineSeed, setEngineSeed] = useState("parity pendulum");
  const [engineSuffix, setEngineSuffix] = useState("preview");
  const [engineStrategy, setEngineStrategy] = useState("manual");
  const [containsForbiddenOverride, setContainsForbiddenOverride] = useState(null);
  const [containsCountOverride, setContainsCountOverride] = useState(null);
  const [labEnabled, setLabEnabled] = useState(false);
  const [labCountRaw, setLabCountRaw] = useState("1000000");

  const modeConfig = MODE_CONFIG[mode];

  const engineLength = useMemo(
    () => clampBigInt(parseBigIntInput(engineLengthRaw, 0n), 0n, ENGINE_HARD_STOP),
    [engineLengthRaw],
  );
  const labCount = useMemo(() => clampBigInt(parseBigIntInput(labCountRaw, 0n), 0n, SCALE_MAX), [labCountRaw]);

  const activeCount = labEnabled ? labCount : mode === "engine" ? engineLength : BigInt(text.length);
  const countWord = numberToWords(activeCount);
  const parity = activeCount % 2n === 0n ? "even" : "odd";
  const activeBand = getScaleBand(activeCount);
  const dominantScale = getDominantScaleDescriptor(activeCount);
  const pressureSourceLabel = getPressureSourceLabel(mode, labEnabled, dominantScale);

  const enginePreviewSurface = [enginePrefix, engineSeed, engineSuffix].filter(Boolean).join(" ").trim();
  const derivedForbidden = containsLetter(enginePreviewSurface, FORBIDDEN_LETTER);
  const derivedCountWord = containsWord(enginePreviewSurface, countWord);
  const forbiddenHit =
    mode === "engine"
      ? engineStrategy === "derived"
        ? derivedForbidden
        : resolveTriState(containsForbiddenOverride, derivedForbidden)
      : containsLetter(text, FORBIDDEN_LETTER);
  const countWordHit =
    mode === "engine"
      ? engineStrategy === "derived"
        ? derivedCountWord
        : resolveTriState(containsCountOverride, derivedCountWord)
      : containsWord(text, countWord);
  const solved = parity === "even" && !forbiddenHit && countWordHit;

  const renderSurfaceLength =
    mode === "engine" ? enginePreviewSurface.length + engineLengthRaw.length + dominantScale.label.length : text.length;
  const renderPressure = pressureFromLength(renderSurfaceLength, mode === "engine" ? 260 : Number(modeConfig.cap), {
    textareaMounted: mode !== "engine",
    fullScanActive: mode !== "engine" || labEnabled,
  });
  const enginePressure =
    mode === "engine"
      ? pressureFromEngineState(dominantScale, enginePreviewSurface.length, engineStrategy, engineStrategy === "derived" && (derivedForbidden || derivedCountWord))
      : 0;
  const boundaryPressure = pressureFromBoundary(dominantScale);

  const previewWords = numberToWords(clampBigInt(mode === "engine" ? engineLength : labCount, 0n, mode === "engine" ? ENGINE_HARD_STOP : SCALE_MAX));

  const formatterChecks = useMemo(
    () =>
      FORMATTER_SAMPLES.map((sample) => {
        const actual = numberToWords(sample.value);
        return {
          ...sample,
          actual,
          pass: actual === sample.expected,
        };
      }),
    [],
  );

  useEffect(() => {
    formatterChecks.forEach((check) => {
      console.assert(check.pass, `Formatter check failed for ${check.label}: ${check.actual}`);
    });
  }, [formatterChecks]);

  return {
    mode,
    setMode,
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
    modeConfig,
    engineLength,
    labCount,
    activeCount,
    countWord,
    parity,
    activeBand,
    dominantScale,
    pressureSourceLabel,
    enginePreviewSurface,
    derivedForbidden,
    derivedCountWord,
    forbiddenHit,
    countWordHit,
    solved,
    renderPressure,
    enginePressure,
    boundaryPressure,
    previewWords,
    formatterChecks,
  };
}
