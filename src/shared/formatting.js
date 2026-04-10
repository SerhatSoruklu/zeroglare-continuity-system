import { SMALL_WORDS, TENS_WORDS } from "./constants.js";

export function clampBigInt(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function parseBigIntInput(raw, fallback) {
  const digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) {
    return fallback;
  }
  try {
    return BigInt(digits);
  } catch {
    return fallback;
  }
}

export function formatBigInt(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function chunkToWords(value) {
  const n = Number(value);
  if (n === 0) {
    return "";
  }

  const parts = [];
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundreds) {
    parts.push(SMALL_WORDS[hundreds], "hundred");
  }

  if (remainder >= 20) {
    parts.push(TENS_WORDS[Math.floor(remainder / 10)]);
    const ones = remainder % 10;
    if (ones) {
      parts.push(SMALL_WORDS[ones]);
    }
  } else if (remainder >= 10) {
    parts.push(SMALL_WORDS[remainder]);
  } else if (remainder > 0) {
    parts.push(SMALL_WORDS[remainder]);
  }

  return parts.join(" ");
}
