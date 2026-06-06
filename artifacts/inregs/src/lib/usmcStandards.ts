/**
 * usmcStandards.ts — USMC Height/Weight & Body Composition Standards
 *
 * SOURCE: MCBul 6110 (20 Dec 2024) — Marine Corps Body Composition and Military Appearance
 *         Per MCO 6110.3A and DoD Height, Weight, and Body Composition Standards
 *
 * Single source of truth for all numeric standards.
 * To update when new standards are issued, edit only this file.
 */

export type Sex = 'male' | 'female';

// =============================================================================
// HEIGHT/WEIGHT TABLES
// Maximum weight differs by sex.
// Heights outside 56–82" are clamped to nearest entry.
// Source: DoD Height, Weight, and Body Composition Standards (MCBul 6110 Encl 1)
// =============================================================================

export const MALE_MAX_WEIGHT_TABLE: Record<number, number> = {
  56: 122, 57: 127, 58: 131, 59: 136, 60: 141,
  61: 145, 62: 150, 63: 155, 64: 160, 65: 165,
  66: 170, 67: 175, 68: 180, 69: 186, 70: 191,
  71: 197, 72: 202, 73: 208, 74: 214, 75: 220,
  76: 225, 77: 231, 78: 237, 79: 244, 80: 250,
  81: 256, 82: 263,
};

export const FEMALE_MAX_WEIGHT_TABLE: Record<number, number> = {
  56: 115, 57: 120, 58: 124, 59: 129, 60: 133,
  61: 137, 62: 142, 63: 146, 64: 151, 65: 156,
  66: 161, 67: 166, 68: 171, 69: 176, 70: 181,
  71: 186, 72: 191, 73: 197, 74: 202, 75: 208,
  76: 213, 77: 219, 78: 225, 79: 230, 80: 236,
  81: 242, 82: 248,
};

// =============================================================================
// BODY FAT STANDARDS BY AGE GROUP
// Source: Marine Corps Body Composition Standards — MCBul 6110 (20 Dec 2024)
//
// Female standards reflect the +1% increase effective 1 January 2023.
//
// Age Group | Male | Female
//   17–20   |  18% |  27%
//   21–25   |  18% |  27%
//   26–30   |  19% |  28%
//   31–35   |  19% |  28%
//   36–40   |  20% |  29%
//   41–45   |  20% |  29%
//   46–50   |  21% |  30%
//    51+    |  21% |  30%
// =============================================================================

export interface BFBracket {
  maxAge: number;
  maxBF: number;
}

export const MALE_BF_STANDARDS: BFBracket[] = [
  { maxAge: 20, maxBF: 18 },
  { maxAge: 25, maxBF: 18 },
  { maxAge: 30, maxBF: 19 },
  { maxAge: 35, maxBF: 19 },
  { maxAge: 40, maxBF: 20 },
  { maxAge: 45, maxBF: 20 },
  { maxAge: 50, maxBF: 21 },
  { maxAge: Infinity, maxBF: 21 },
];

export const FEMALE_BF_STANDARDS: BFBracket[] = [
  { maxAge: 20, maxBF: 27 },
  { maxAge: 25, maxBF: 27 },
  { maxAge: 30, maxBF: 28 },
  { maxAge: 35, maxBF: 28 },
  { maxAge: 40, maxBF: 29 },
  { maxAge: 45, maxBF: 29 },
  { maxAge: 50, maxBF: 30 },
  { maxAge: Infinity, maxBF: 30 },
];

// =============================================================================
// PERFORMANCE EXEMPTIONS / ALLOWANCES
// Source: MCBul 6110 (20 Dec 2024), para 4.a.(2)(f)
//
// A current 285 PFT or CFT score = MCBCMAP exempt (pass regardless of BF).
// A score of 250–284 PFT or CFT = +1% additional body fat allowance.
// The higher of PFT or CFT score is used.
// =============================================================================

export const PERFORMANCE = {
  EXEMPTION_SCORE: 285,
  ALLOWANCE_SCORE: 250,
  ALLOWANCE_BF_PCT: 1,
} as const;

// =============================================================================
// DoD CIRCUMFERENCE (TAPE METHOD) FORMULA COEFFICIENTS
// Circumference method is the initial screening tool.
// BIA (InBody 770) is required for formal BCP assignment verification.
// =============================================================================

export const TAPE_METHOD = {
  male: {
    A: 86.010,
    B: 70.041,
    C: 36.76,
  },
  female: {
    A: 163.205,
    B: 97.684,
    C: 78.387,
    HIP_FALLBACK_MULTIPLIER: 1.15,
  },
} as const;

// =============================================================================
// WATCH ZONE THRESHOLDS (app-defined, not from MCO)
// =============================================================================

export const WATCH_ZONE = {
  WEIGHT_LBS: 10,
  BODY_FAT_PCT: 3,
} as const;

// =============================================================================
// FITNESS SCORE THRESHOLDS
// =============================================================================

export const FITNESS_SCORE_THRESHOLDS = {
  FIRST_CLASS: 285,
  SECOND_CLASS: 225,
  THIRD_CLASS: 150,
} as const;

export const HEIGHT_RANGE = {
  MIN_INCHES: 56,
  MAX_INCHES: 82,
} as const;

// =============================================================================
// ACCESSOR FUNCTIONS
// =============================================================================

export function getMaxAllowableWeight(sex: Sex, heightInches: number): number {
  const table = sex === 'male' ? MALE_MAX_WEIGHT_TABLE : FEMALE_MAX_WEIGHT_TABLE;
  const h = Math.round(
    Math.min(HEIGHT_RANGE.MAX_INCHES, Math.max(HEIGHT_RANGE.MIN_INCHES, heightInches))
  );
  return table[h] ?? (sex === 'male' ? MALE_MAX_WEIGHT_TABLE[82] : FEMALE_MAX_WEIGHT_TABLE[82]);
}

export function getMaxAllowableBodyFat(sex: Sex, age: number): number {
  const brackets = sex === 'male' ? MALE_BF_STANDARDS : FEMALE_BF_STANDARDS;
  const bracket = brackets.find((b) => age <= b.maxAge);
  return bracket?.maxBF ?? brackets[brackets.length - 1].maxBF;
}

export function estimateBodyFatPct(
  sex: Sex,
  heightInches: number,
  neckInches: number,
  waistInches: number,
  hipInches?: number
): number {
  if (sex === 'male') {
    const { A, B, C } = TAPE_METHOD.male;
    const diff = waistInches - neckInches;
    if (diff <= 0) return 0;
    const bf = A * Math.log10(diff) - B * Math.log10(heightInches) + C;
    return Math.max(0, Math.round(bf * 10) / 10);
  } else {
    const { A, B, C, HIP_FALLBACK_MULTIPLIER } = TAPE_METHOD.female;
    const hip = hipInches ?? waistInches * HIP_FALLBACK_MULTIPLIER;
    const sum = waistInches + hip - neckInches;
    if (sum <= 0) return 0;
    const bf = A * Math.log10(sum) - B * Math.log10(heightInches) - C;
    return Math.max(0, Math.round(bf * 10) / 10);
  }
}

export function fitnessScoreLabel(
  score: number
): 'First Class' | 'Second Class' | 'Third Class' | 'Failure' {
  if (score >= FITNESS_SCORE_THRESHOLDS.FIRST_CLASS) return 'First Class';
  if (score >= FITNESS_SCORE_THRESHOLDS.SECOND_CLASS) return 'Second Class';
  if (score >= FITNESS_SCORE_THRESHOLDS.THIRD_CLASS) return 'Third Class';
  return 'Failure';
}
