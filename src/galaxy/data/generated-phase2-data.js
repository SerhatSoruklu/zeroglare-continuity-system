import { GALAXY_PHASE1_REGION } from "./phase1-data.js";
import { generateStars } from "../generated-stars.js";

export const GALAXY_PHASE2_GENERATED_STARS = Object.freeze(generateStars(GALAXY_PHASE1_REGION, "medium"));
