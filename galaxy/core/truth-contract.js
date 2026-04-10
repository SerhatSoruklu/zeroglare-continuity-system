export const STAR_TYPES = Object.freeze(["anchor", "catalog", "generated"]);
export const STAR_SOURCES = Object.freeze(["observed", "measured", "model"]);
export const CONFIDENCE_LEVELS = Object.freeze(["high", "statistical"]);

export const STAR_SOURCE_BY_TYPE = Object.freeze({
  anchor: "observed",
  catalog: "measured",
  generated: "model",
});

export const STAR_CONFIDENCE_BY_TYPE = Object.freeze({
  anchor: "high",
  catalog: "high",
  generated: "statistical",
});

export const REGION_KINDS = Object.freeze(["galactic_center", "bulge", "disk", "halo", "arm", "sector"]);
export const REGION_SOURCES = STAR_SOURCES;

const STAR_FIELDS = Object.freeze([
  "id",
  "name",
  "type",
  "source",
  "ra",
  "dec",
  "distance_ly",
  "magnitude",
  "constellation",
]);

const REGION_FIELDS = Object.freeze([
  "id",
  "name",
  "kind",
  "source",
  "confidence",
  "frame",
  "description",
  "order",
  "centerLyFromCore",
  "spanLy",
]);

const LAYER_FIELDS = Object.freeze([
  "id",
  "name",
  "type",
  "source",
  "confidence",
  "frame",
  "description",
  "order",
]);

export const STAR_SCHEMA = Object.freeze({
  kind: "discriminated-union",
  discriminator: "type",
  fields: STAR_FIELDS,
  variants: Object.freeze({
    anchor: Object.freeze({
      type: "anchor",
      source: "observed",
      fields: STAR_FIELDS,
    }),
    catalog: Object.freeze({
      type: "catalog",
      source: "measured",
      fields: STAR_FIELDS,
    }),
    generated: Object.freeze({
      type: "generated",
      source: "model",
      fields: STAR_FIELDS,
    }),
  }),
});

export const REGION_SCHEMA = Object.freeze({
  kind: "record",
  fields: REGION_FIELDS,
  variants: Object.freeze({
    observed: Object.freeze({
      source: "observed",
      fields: REGION_FIELDS,
    }),
    measured: Object.freeze({
      source: "measured",
      fields: REGION_FIELDS,
    }),
    model: Object.freeze({
      source: "model",
      fields: REGION_FIELDS,
    }),
  }),
});

export const LAYER_SCHEMA = Object.freeze({
  kind: "discriminated-union",
  discriminator: "type",
  fields: LAYER_FIELDS,
  variants: Object.freeze({
    anchor: Object.freeze({
      type: "anchor",
      source: "observed",
      confidence: "high",
      fields: LAYER_FIELDS,
    }),
    catalog: Object.freeze({
      type: "catalog",
      source: "measured",
      confidence: "high",
      fields: LAYER_FIELDS,
    }),
    generated: Object.freeze({
      type: "generated",
      source: "model",
      confidence: "statistical",
      fields: LAYER_FIELDS,
    }),
  }),
});

export const TRUTH_CONTRACT = Object.freeze({
  starTypes: STAR_TYPES,
  starSources: STAR_SOURCES,
  confidenceLevels: CONFIDENCE_LEVELS,
  regionKinds: REGION_KINDS,
  regionSources: REGION_SOURCES,
  starSourceByType: STAR_SOURCE_BY_TYPE,
  starConfidenceByType: STAR_CONFIDENCE_BY_TYPE,
  starSchema: STAR_SCHEMA,
  regionSchema: REGION_SCHEMA,
  layerSchema: LAYER_SCHEMA,
});

export const FORBIDDEN_STAR_COMBINATIONS = Object.freeze([
  Object.freeze({ type: "anchor", source: "measured" }),
  Object.freeze({ type: "anchor", source: "model" }),
  Object.freeze({ type: "catalog", source: "observed" }),
  Object.freeze({ type: "catalog", source: "model" }),
  Object.freeze({ type: "generated", source: "observed" }),
  Object.freeze({ type: "generated", source: "measured" }),
]);

export class TruthContractError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TruthContractError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details) {
  throw new TruthContractError(code, message, details);
}

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPlainObject(value, label) {
  if (!isPlainObject(value)) {
    fail("INVALID_RECORD", `${label} must be a plain object.`, { label, received: value });
  }
}

function assertExactKeys(value, expectedKeys, label) {
  const keys = Object.keys(value);
  const missing = expectedKeys.filter((key) => !Object.prototype.hasOwnProperty.call(value, key));
  const extra = keys.filter((key) => !expectedKeys.includes(key));
  if (missing.length || extra.length) {
    fail("SCHEMA_MISMATCH", `${label} must contain exactly the required fields.`, {
      label,
      missing,
      extra,
      expectedKeys,
    });
  }
}

function assertStringField(value, field, label) {
  if (typeof value[field] !== "string" || value[field].trim() === "") {
    fail("INVALID_STRING", `${label}.${field} must be a non-empty string.`, {
      label,
      field,
      received: value[field],
    });
  }
}

function assertFiniteNumberField(value, field, label) {
  if (typeof value[field] !== "number" || !Number.isFinite(value[field])) {
    fail("INVALID_NUMBER", `${label}.${field} must be a finite number.`, {
      label,
      field,
      received: value[field],
    });
  }
}

function assertEnumField(value, field, allowedValues, label) {
  if (!allowedValues.includes(value[field])) {
    fail("INVALID_ENUM", `${label}.${field} must be one of the allowed values.`, {
      label,
      field,
      received: value[field],
      allowedValues,
    });
  }
}

function freezeRecord(record) {
  return Object.freeze({ ...record });
}

export function assertValidSource(type, source) {
  if (!STAR_TYPES.includes(type)) {
    fail("INVALID_STAR_TYPE", "Star type must be one of anchor, catalog, or generated.", {
      type,
      allowedTypes: STAR_TYPES,
    });
  }

  if (!STAR_SOURCES.includes(source)) {
    fail("INVALID_SOURCE", "Star source must be one of observed, measured, or model.", {
      type,
      source,
      allowedSources: STAR_SOURCES,
    });
  }

  const expected = STAR_SOURCE_BY_TYPE[type];
  if (source !== expected) {
    fail("INVALID_TYPE_SOURCE_COMBINATION", `Star type ${type} must use source ${expected}.`, {
      type,
      source,
      expectedSource: expected,
    });
  }

  return source;
}

export function validateStar(star) {
  assertPlainObject(star, "Star");
  assertExactKeys(star, STAR_FIELDS, "Star");
  assertStringField(star, "id", "Star");
  assertStringField(star, "name", "Star");
  assertStringField(star, "type", "Star");
  assertStringField(star, "source", "Star");
  assertStringField(star, "constellation", "Star");
  assertFiniteNumberField(star, "ra", "Star");
  assertFiniteNumberField(star, "dec", "Star");
  assertFiniteNumberField(star, "distance_ly", "Star");
  assertFiniteNumberField(star, "magnitude", "Star");
  assertEnumField(star, "type", STAR_TYPES, "Star");
  assertValidSource(star.type, star.source);
  if (star.ra < 0 || star.ra >= 360) {
    fail("INVALID_RA", "Star.raDeg must be within [0, 360).", {
      received: star.ra,
    });
  }

  if (star.dec < -90 || star.dec > 90) {
    fail("INVALID_DEC", "Star.decDeg must be within [-90, 90].", {
      received: star.dec,
    });
  }

  if (star.distance_ly <= 0) {
    fail("INVALID_DISTANCE", "Star.distance_ly must be greater than 0.", {
      received: star.distance_ly,
    });
  }

  return freezeRecord(star);
}

export function validateRegion(region) {
  assertPlainObject(region, "Region");
  assertExactKeys(region, REGION_FIELDS, "Region");
  assertStringField(region, "id", "Region");
  assertStringField(region, "name", "Region");
  assertStringField(region, "kind", "Region");
  assertStringField(region, "source", "Region");
  assertStringField(region, "confidence", "Region");
  assertStringField(region, "frame", "Region");
  assertStringField(region, "description", "Region");
  assertFiniteNumberField(region, "order", "Region");
  assertFiniteNumberField(region, "centerLyFromCore", "Region");
  assertFiniteNumberField(region, "spanLy", "Region");
  assertEnumField(region, "kind", REGION_KINDS, "Region");
  assertEnumField(region, "source", REGION_SOURCES, "Region");
  assertEnumField(region, "confidence", CONFIDENCE_LEVELS, "Region");

  if (region.frame !== "galactic") {
    fail("INVALID_REGION_FRAME", "Region.frame must be galactic.", {
      received: region.frame,
      allowedValues: ["galactic"],
    });
  }

  if (region.order < 0 || !Number.isInteger(region.order)) {
    fail("INVALID_REGION_ORDER", "Region.order must be a non-negative integer.", {
      received: region.order,
    });
  }

  if (region.centerLyFromCore < 0) {
    fail("INVALID_REGION_CENTER", "Region.centerLyFromCore must be greater than or equal to 0.", {
      received: region.centerLyFromCore,
    });
  }

  if (region.spanLy <= 0) {
    fail("INVALID_REGION_SPAN", "Region.spanLy must be greater than 0.", {
      received: region.spanLy,
    });
  }

  return freezeRecord(region);
}

export function validateLayer(layer) {
  assertPlainObject(layer, "Layer");
  assertExactKeys(layer, LAYER_FIELDS, "Layer");
  assertStringField(layer, "id", "Layer");
  assertStringField(layer, "name", "Layer");
  assertStringField(layer, "type", "Layer");
  assertStringField(layer, "source", "Layer");
  assertStringField(layer, "confidence", "Layer");
  assertStringField(layer, "frame", "Layer");
  assertStringField(layer, "description", "Layer");
  assertFiniteNumberField(layer, "order", "Layer");
  assertEnumField(layer, "type", STAR_TYPES, "Layer");
  assertValidSource(layer.type, layer.source);
  assertEnumField(layer, "confidence", CONFIDENCE_LEVELS, "Layer");

  if (layer.frame !== "galactic") {
    fail("INVALID_LAYER_FRAME", "Layer.frame must be galactic.", {
      received: layer.frame,
      allowedValues: ["galactic"],
    });
  }

  if (layer.order < 0 || !Number.isInteger(layer.order)) {
    fail("INVALID_LAYER_ORDER", "Layer.order must be a non-negative integer.", {
      received: layer.order,
    });
  }

  const expectedConfidence = STAR_CONFIDENCE_BY_TYPE[layer.type];
  if (layer.confidence !== expectedConfidence) {
    fail("INVALID_LAYER_CONFIDENCE", `Layer type ${layer.type} must use confidence ${expectedConfidence}.`, {
      type: layer.type,
      confidence: layer.confidence,
      expectedConfidence,
    });
  }

  return freezeRecord(layer);
}
