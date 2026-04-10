export const MODE_CONFIG = {
  safe: {
    label: "Safe",
    detail: "Textarea-bound and capped at 250,000 chars.",
    cap: 250000n,
    source: "Render-bound",
  },
  unsafe: {
    label: "Unsafe",
    detail: "Textarea-bound and capped at 5,000,000 chars.",
    cap: 5000000n,
    source: "Render-bound",
  },
  engine: {
    label: "Engine",
    detail: "Symbolic, logic-bound, and textarea-free for giant lengths.",
    cap: 1000000000000000000n,
    source: "Engine-bound",
  },
};

export const FORBIDDEN_LETTER = "x";
export const SCALE_MAX = 1000000000000000000n;
export const ENGINE_HARD_STOP = 10n ** 3003n;
export const SCALE_NAME_BUDGET_MS = 60;

export const QUICK_LENGTHS = [
  1000n,
  1000000n,
  1000000000n,
  1000000000000n,
  1000000000000000n,
  1000000000000000000n,
];

export const SCALE_MILESTONES = [
  { label: "thousand", value: 1000n },
  { label: "million", value: 1000000n },
  { label: "billion", value: 1000000000n },
  { label: "trillion", value: 1000000000000n },
  { label: "quadrillion", value: 1000000000000000n },
  { label: "quintillion", value: 1000000000000000000n },
];

export const SMALL_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

export const TENS_WORDS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

export const REAL_SCALE_NAMES = new Map([
  [1, "thousand"],
  [2, "million"],
  [3, "billion"],
  [4, "trillion"],
  [5, "quadrillion"],
  [6, "quintillion"],
  [7, "sextillion"],
  [8, "septillion"],
  [9, "octillion"],
  [10, "nonillion"],
  [11, "decillion"],
  [12, "undecillion"],
  [13, "duodecillion"],
  [14, "tredecillion"],
  [15, "quattuordecillion"],
  [16, "quindecillion"],
  [17, "sexdecillion"],
  [18, "septendecillion"],
  [19, "octodecillion"],
  [20, "novemdecillion"],
  [21, "vigintillion"],
  [101, "centillion"],
  [1001, "millinillion"],
]);

export const VERIFIED_REAL_SCALE_CEILING_INDEX = 1001;
export const VERIFIED_REAL_SCALE_CEILING_LABEL =
  REAL_SCALE_NAMES.get(VERIFIED_REAL_SCALE_CEILING_INDEX) || "millinillion";

export const UNIT_PREFIXES = {
  0: "",
  1: "un",
  2: "duo",
  3: "tre",
  4: "quattuor",
  5: "quinqua",
  6: "sex",
  7: "septen",
  8: "octo",
  9: "novem",
};

export const TENS_PREFIXES = {
  0: "",
  1: "deci",
  2: "vigint",
  3: "trigint",
  4: "quadragint",
  5: "quinquagint",
  6: "sexagint",
  7: "septuagint",
  8: "octogint",
  9: "nonagint",
};

export const HUNDREDS_PREFIXES = {
  0: "",
  1: "cent",
  2: "ducent",
  3: "trecent",
  4: "quadringent",
  5: "quingent",
  6: "sescent",
  7: "septingent",
  8: "octingent",
  9: "nongent",
};

export const FORMATTER_SAMPLES = [
  { value: 0n, expected: "zero", label: "Zero" },
  { value: 1000n, expected: "one thousand", label: "Thousand" },
  { value: 1000000n, expected: "one million", label: "Million" },
  { value: 1000000000n, expected: "one billion", label: "Billion" },
  { value: 1000000000000n, expected: "one trillion", label: "Trillion" },
  { value: 1000000000000000n, expected: "one quadrillion", label: "Quadrillion" },
  { value: 1000000000000000000n, expected: "one quintillion", label: "Quintillion" },
  { value: 1000000000000000000000n, expected: "one sextillion", label: "Sextillion" },
  { value: 10n ** 63n, expected: "one vigintillion", label: "Vigintillion" },
  { value: 10n ** 303n, expected: "one centillion", label: "Centillion" },
  { value: ENGINE_HARD_STOP, expected: "one millinillion", label: "Millinillion" },
  { value: 10n ** 3006n, expected: "greater than millinillion", label: "Boundary clamp" },
];

export const SCALE_NAME_SANITY_SAMPLES = [
  { label: "quintillion", index: 6, expected: "quintillion", source: "real" },
  { label: "vigintillion", index: 21, expected: "vigintillion", source: "real" },
  { label: "centillion", index: 101, expected: "centillion", source: "real" },
  { label: "millinillion", index: 1001, expected: "millinillion", source: "real" },
  { label: "limit", index: 1002, expected: "greater than millinillion", source: "generated-limit", budgetMs: 0 },
];
