import {
  HUNDREDS_PREFIXES,
  REAL_SCALE_NAMES,
  SCALE_NAME_BUDGET_MS,
  VERIFIED_REAL_SCALE_CEILING_INDEX,
  VERIFIED_REAL_SCALE_CEILING_LABEL,
  TENS_PREFIXES,
  UNIT_PREFIXES,
} from "./constants.js";
import { chunkToWords } from "./formatting.js";

export function getScaleIndexFromDigitCount(digits) {
  if (!Number.isFinite(digits) || digits <= 3) {
    return 0;
  }
  return Math.floor((digits - 1) / 3);
}

export function getRealScaleName(index) {
  return REAL_SCALE_NAMES.get(index) || "";
}

export function buildGeneratedIllionName(scaleIndex) {
  const base = Math.max(0, scaleIndex - 1);
  const hundreds = Math.floor(base / 100) % 10;
  const tens = Math.floor(base / 10) % 10;
  const units = base % 10;
  const parts = [
    UNIT_PREFIXES[units] || "",
    TENS_PREFIXES[tens] || "",
    HUNDREDS_PREFIXES[hundreds] || "",
  ].filter(Boolean);

  if (!parts.length) {
    return "thousand";
  }

  return `${parts.join("")}illion`;
}

export function getScaleNameWithBudget(index, budgetMs = SCALE_NAME_BUDGET_MS) {
  const start = performance.now();

  const real = getRealScaleName(index);
  if (real) {
    return {
      label: real,
      source: "real",
      sourceLabel: "verified real table",
      boundaryStatus: index === VERIFIED_REAL_SCALE_CEILING_INDEX ? "highest supported real entry" : "within supported range",
    };
  }

  if (index > VERIFIED_REAL_SCALE_CEILING_INDEX) {
    return {
      label: `greater than ${VERIFIED_REAL_SCALE_CEILING_LABEL}`,
      source: "generated-limit",
      sourceLabel: "unresolved beyond verified real scale table",
      boundaryStatus: "outside supported boundary",
    };
  }

  const generated = buildGeneratedIllionName(index);
  if (performance.now() - start > budgetMs) {
    return {
      label: `greater than ${VERIFIED_REAL_SCALE_CEILING_LABEL}`,
      source: "generated-limit",
      sourceLabel: "unresolved beyond verified real scale table",
      boundaryStatus: "outside supported boundary",
    };
  }

  return {
    label: generated,
    source: "generated",
    sourceLabel: "generated helper",
    boundaryStatus: "within supported range",
  };
}

export function getScaleLabel(scaleIndex, budgetMs = SCALE_NAME_BUDGET_MS) {
  if (scaleIndex === 0) {
    return {
      label: "",
      type: "real",
      sourceLabel: "verified real table",
      boundaryStatus: "within supported range",
      isVerified: true,
    };
  }

  const real = REAL_SCALE_NAMES.get(scaleIndex);
  if (real) {
    return {
      label: real,
      type: "real",
      sourceLabel: "verified real table",
      boundaryStatus: scaleIndex === VERIFIED_REAL_SCALE_CEILING_INDEX ? "highest supported real entry" : "within supported range",
      isVerified: true,
    };
  }

  if (scaleIndex > VERIFIED_REAL_SCALE_CEILING_INDEX) {
    return {
      label: `greater than ${VERIFIED_REAL_SCALE_CEILING_LABEL}`,
      type: "generated-limit",
      sourceLabel: "unresolved beyond verified real scale table",
      boundaryStatus: "outside supported boundary",
      isVerified: false,
    };
  }

  const started = performance.now();
  const generated = buildGeneratedIllionName(scaleIndex);
  if (performance.now() - started > budgetMs) {
    return {
      label: `greater than ${VERIFIED_REAL_SCALE_CEILING_LABEL}`,
      type: "generated-limit",
      sourceLabel: "unresolved beyond verified real scale table",
      boundaryStatus: "outside supported boundary",
      isVerified: false,
    };
  }

  return {
    label: generated,
    type: "generated",
    sourceLabel: "generated helper",
    boundaryStatus: "within supported range",
    isVerified: false,
  };
}

export function getDominantScaleDescriptor(value, budgetMs = SCALE_NAME_BUDGET_MS) {
  const magnitude = value < 0n ? -value : value;
  if (magnitude < 1000n) {
    return {
      label: "sub-thousand",
      type: "real",
      sourceLabel: "verified real table",
      boundaryStatus: "within supported range",
      group: 0,
      isVerified: true,
    };
  }

  const digits = magnitude.toString().length;
  const group = Math.floor((digits - 1) / 3);
  const labelInfo = getScaleLabel(group, budgetMs);
  return { ...labelInfo, group };
}

export function numberToWords(value) {
  let current = typeof value === "bigint" ? value : BigInt(value);
  if (current === 0n) {
    return "zero";
  }
  if (current < 0n) {
    return `minus ${numberToWords(-current)}`;
  }

  const parts = [];
  let scaleIndex = 0;

  while (current > 0n) {
    const chunk = Number(current % 1000n);
    if (chunk) {
      const words = chunkToWords(chunk);
      const scaleWordInfo = getScaleLabel(scaleIndex);
      if (scaleWordInfo.type === "generated-limit") {
        return scaleWordInfo.label;
      }
      parts.push(scaleWordInfo.label ? `${words} ${scaleWordInfo.label}` : words);
    }
    current /= 1000n;
    scaleIndex += 1;
  }

  return parts.reverse().join(" ");
}

export function resolveScaleDescriptorFromValue(rawValue, budgetMs = SCALE_NAME_BUDGET_MS) {
  const text = String(rawValue).trim();
  const digitsOnly = text.replace(/[^\d]/g, "");
  if (!digitsOnly) {
    return {
      label: "sub-thousand",
      source: "real",
      sourceLabel: "verified real table",
      boundaryStatus: "within supported range",
      digitCount: 0,
    };
  }

  const digitCount = digitsOnly.length;
  const scaleIndex = getScaleIndexFromDigitCount(digitCount);
  const nameInfo = getScaleNameWithBudget(scaleIndex, budgetMs);
  return {
    label: nameInfo.label,
    source: nameInfo.source,
    sourceLabel: nameInfo.sourceLabel,
    boundaryStatus: nameInfo.boundaryStatus,
    digitCount,
    scaleIndex,
  };
}
