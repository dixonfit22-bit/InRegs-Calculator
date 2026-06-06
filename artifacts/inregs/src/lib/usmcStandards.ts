/**
 * usmcStandards.ts — USMC Height/Weight & Body Composition Standards
 *
 * SOURCE: MCO 6100.13A W/CH 3 (Marine Corps Body Composition and
 *         Military Appearance Program), effective 01 Jul 2023.
 *
 * Single source of truth for all numeric standards.
 */

export type Sex = 'male' | 'female';

// Height/Weight Tables — MCO 6100.13A Table 6-1
export const MALE_MAX_WEIGHT_TABLE: Record<number, number> = {
  58: 131, 59: 133, 60: 136, 61: 139, 62: 141, 63: 144, 64: 148,
  65: 150, 66: 170, 67: 156, 68: 160, 69: 163, 70: 166, 71: 170,
  72: 173, 73: 176, 74: 180, 75: 183, 76: 186, 77: 190, 78: 193,
  79: 196, 80: 200,
};

export const FEMALE_MAX_WEIGHT_TABLE: Record<number, number> = {
  58: 119, 59: 121, 60: 124, 61: 127, 62: 130, 63: 133, 64: 137,
  65: 139, 66: 142, 67: 145, 68: 148, 69: 152, 70: 155, 71: 158,
  72: 161, 73: 164, 74: 168, 75: 171, 76: 174, 77: 177, 78: 180,
  79: 183, 80: 186,
};

// Body Fat Standards — MCO 6100.13A Table 6-2
export interface BFBracket {
  maxAge: number;
  maxBF: number;
}

export const MALE_BF_STANDARDS: BFBracket[] = [
  { maxAge: 25, maxBF: 18 },
  { maxAge: 30, maxBF: 19 },
  { maxAge: 35, maxBF: 20 },
  { maxAge: 40, maxBF: 21 },
  { maxAge: Infinity, maxBF: 22 },
];

export const FEMALE_BF_STANDARDS: BFBracket[] = [
  { maxAge: 25, maxBF: 26 },
  { maxAge: 30, maxBF: 27 },
  { maxAge: 35, maxBF: 28 },
  { maxAge: 40, maxBF: 29 },
  { maxAge: Infinity, maxBF: 30 },
];

// DoD Circumference (Tape Method) Formula Coefficients
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

// Watch Zone Thresholds (app-defined, not from MCO)
export const WATCH_ZONE = {
  WEIGHT_LBS: 10,
  BODY_FAT_PCT: 3,
} as const;

// Fitness Score Thresholds
export const FITNESS_SCORE_THRESHOLDS = {
  FIRST_CLASS: 285,
  SECOND_CLASS: 225,
  THIRD_CLASS: 150,
} as const;

export const HEIGHT_RANGE = {
  MIN_INCHES: 58,
  MAX_INCHES: 80,
} as const;

// Accessor Functions

export function getMaxAllowableWeight(sex: Sex, heightInches: number): number {
  const table = sex === 'male' ? MALE_MAX_WEIGHT_TABLE : FEMALE_MAX_WEIGHT_TABLE;
  const h = Math.round(
    Math.min(HEIGHT_RANGE.MAX_INCHES, Math.max(HEIGHT_RANGE.MIN_INCHES, heightInches))
  );
  return table[h] ?? (sex === 'male' ? MALE_MAX_WEIGHT_TABLE[80] : FEMALE_MAX_WEIGHT_TABLE[80]);
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
