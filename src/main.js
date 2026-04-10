import { mountPendulumApp } from "./pendulum/mountPendulumApp.js";
import { bindPendulumActivation } from "./landing/bindPendulumActivation.js";
import { bindScaleNamingTool } from "./landing/bindScaleNamingTool.js";
import { bindFrameIsolationLayer } from "./landing/bindFrameIsolationLayer.js";
import { bindSignalExtractionLayer } from "./landing/bindSignalExtractionLayer.js";
import { bindSignalStabilityLayer } from "./landing/bindSignalStabilityLayer.js";
import { bindSignalMeasurementLayer } from "./landing/bindSignalMeasurementLayer.js";
import { bindSignalInferenceLayer } from "./landing/bindSignalInferenceLayer.js";
import { bindBoundedOutputLayer } from "./landing/bindBoundedOutputLayer.js";

mountPendulumApp();
bindPendulumActivation();
bindScaleNamingTool();
bindFrameIsolationLayer();
bindSignalExtractionLayer();
bindSignalStabilityLayer();
bindSignalMeasurementLayer();
bindSignalInferenceLayer();
bindBoundedOutputLayer();
