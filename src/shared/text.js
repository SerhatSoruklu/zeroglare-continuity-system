import { cx } from "./classNames.js";

export { cx };

export function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsLetter(text, letter) {
  const lower = letter.toLowerCase();
  const upper = letter.toUpperCase();
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === lower || char === upper) {
      return true;
    }
  }
  return false;
}

export function containsWord(text, word) {
  if (!word) {
    return false;
  }
  return new RegExp(escapeRegExp(word), "i").test(text);
}

export function truncateLabel(text, limit) {
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, Math.max(0, limit - 1))}…`;
}
