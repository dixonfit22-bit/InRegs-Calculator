/**
 * marineStandards.ts — Calculator Engine
 *
 * Contains only calculation logic. All numeric thresholds live in usmcStandards.ts.
 * Sources: MCBul 6110 (20 Dec 2024), MCO 6110.3A
 */

import {
  Sex,
  getMaxAllowableWeight,
  getMaxAllowableBodyFat,
  estimateBodyFatPct,
  getWHtRMaxWaist,
  WATCH_ZONE,
  PERFORMANCE,
} from './usmcStandards';

export type { Sex };

export interface MarineInput {
  sex: Sex;
  age: number;
  heightInches: number;
  weightLbs: number;
  neckInches: number;
  waistInches: number;
  hipInches?: number;
  pftScore: number;
  cftScore: number;
}

export interface RegResult {
  currentWeight: number;
  estimatedBodyFat: number;
  passFailStatus: 'PASS' | 'FAIL';
  riskLevel: 'In Regs' | 'Watch Zone' | 'Out of Regs';
  message: string;
  poundsToLose: number | null;
  waistToLose: number | null;
  maxAllowableWeight: number;
  maxBodyFat: number;
  effectiveMaxBodyFat: number;
  overWeightLimit: boolean;
  tapeRequired: boolean;
  performanceExempt: boolean;
  performanceAllowance: boolean;
  bestFitnessScore: number;
  whtrRatio: number;
  whtrMaxWaist: number | null;
  whtrPass: boolean;
}

const WAIST_INCHES_PER_BF_PCT = 0.9;

export function calculateRegStatus(input: MarineInput): RegResult {
  const { sex, age, heightInches, weightLbs, neckInches, waistInches, hipInches, pftScore, cftScore } = input;

  // --- Standards lookup ---
  const maxWeight = getMaxAllowableWeight(sex, heightInches);
  const baseBF = getMaxAllowableBodyFat(sex, age);
  const estimatedBF = estimateBodyFatPct(sex, heightInches, neckInches, waistInches, hipInches);

  // --- WHtR screening ---
  const whtrRatio = Math.round((waistInches / heightInches) * 1000) / 1000;
  const whtrMaxWaist = getWHtRMaxWaist(heightInches);
  const whtrPass = whtrMaxWaist !== null ? waistInches <= whtrMaxWaist : whtrRatio < 0.52;

  // --- Performance exemption / allowance (MARADMIN 066/26, effective 1 Jan 2026) ---
  // BOTH the most recent PFT and CFT must qualify — the minimum of the two is used.
  const minFitnessScore = Math.min(pftScore, cftScore);
  const bothScoresExempt = minFitnessScore >= PERFORMANCE.EXEMPTION_SCORE;
  const bothScoresAllowance = !bothScoresExempt && minFitnessScore >= PERFORMANCE.ALLOWANCE_SCORE;

  // Absolute BF cap per MARADMIN 066/26 (26% male / 36% female)
  const exemptionCap = sex === 'male' ? PERFORMANCE.EXEMPTION_CAP_MALE : PERFORMANCE.EXEMPTION_CAP_FEMALE;

  // 285 BOTH → effective limit raised to absolute cap (not a complete pass)
  // 250+ BOTH → standard + 1%, capped at absolute cap
  // Neither → age-group standard
  let effectiveMaxBodyFat: number;
  if (bothScoresExempt) {
    effectiveMaxBodyFat = exemptionCap;
  } else if (bothScoresAllowance) {
    effectiveMaxBodyFat = Math.min(baseBF + PERFORMANCE.ALLOWANCE_BF_PCT, exemptionCap);
  } else {
    effectiveMaxBodyFat = baseBF;
  }

  // Keep these for display / backwards compat with result shape
  const performanceExempt = bothScoresExempt;
  const performanceAllowance = bothScoresAllowance;
  const bestFitnessScore = minFitnessScore; // now = lower of the two (both must qualify)

  // --- Pass/Fail ---
  // Under MARADMIN 066/26: WHtR is the first screen.
  // If WHtR > 0.52, tape/BIA is administered. Fail only if BF exceeds effective limit.
  // Height/weight table still used to determine if tape is triggered (pending new MCO).
  const overWeightLimit = weightLbs > maxWeight;
  const overBFLimit = estimatedBF > effectiveMaxBodyFat;
  const tapeRequired = overWeightLimit || !whtrPass;
  const failedTape = tapeRequired && overBFLimit;
  const isFailing = failedTape;

  // --- Reduction estimates ---
  const poundsToLose = overWeightLimit ? Math.ceil(weightLbs - maxWeight) : null;
  const waistToLose = isFailing
    ? Math.ceil((estimatedBF - effectiveMaxBodyFat) * WAIST_INCHES_PER_BF_PCT)
    : null;

  // --- Watch Zone ---
  const nearWeightLimit = !overWeightLimit && weightLbs >= maxWeight - WATCH_ZONE.WEIGHT_LBS;
  const nearBFLimit = !overBFLimit && estimatedBF >= effectiveMaxBodyFat - WATCH_ZONE.BODY_FAT_PCT;
  const isWatchZone = !isFailing && (nearWeightLimit || nearBFLimit);

  const riskLevel: RegResult['riskLevel'] = isFailing
    ? 'Out of Regs'
    : isWatchZone
    ? 'Watch Zone'
    : 'In Regs';

  const passFailStatus: 'PASS' | 'FAIL' = isFailing ? 'FAIL' : 'PASS';

  // --- Plain-English message ---
  let message = '';
  const biaNote = 'Note: tape results are a screening estimate only. Formal BCP assignment requires BIA verification using the InBody 770 per MCBul 6110.';

  const perfNote = performanceExempt
    ? ` Both PFT and CFT scores of ${bestFitnessScore}+ raised your effective BF limit to ${effectiveMaxBodyFat}% per MARADMIN 066/26.`
    : performanceAllowance
    ? ` Both PFT and CFT scores of ${bestFitnessScore}+ applied a +1% BF allowance (effective limit: ${effectiveMaxBodyFat}%) per MARADMIN 066/26.`
    : '';

  if (riskLevel === 'Out of Regs') {
    message =
      `Your estimated body fat of ${estimatedBF}% exceeds the ${effectiveMaxBodyFat}% effective limit.${perfNote} ` +
      (overWeightLimit ? `You are also over the weight table limit (${weightLbs} lbs vs. ${maxWeight} lb max). ` : '') +
      `See recommendations below. ` + biaNote;
  } else if (riskLevel === 'Watch Zone') {
    const reasons: string[] = [];
    if (nearWeightLimit)
      reasons.push(`weight (${weightLbs} lbs — only ${maxWeight - weightLbs} lbs under the ${maxWeight} lb limit)`);
    if (nearBFLimit)
      reasons.push(`estimated body fat (${estimatedBF}% — only ${(effectiveMaxBodyFat - estimatedBF).toFixed(1)}% under the ${effectiveMaxBodyFat}% limit)`);
    message =
      `You're in the Watch Zone for your ${reasons.join(' and ')}.${perfNote} ` +
      `You're technically within standards but close to the edge. Tighten up before your next evaluation. ` +
      biaNote;
  } else if (overWeightLimit && !failedTape) {
    message =
      `You are over the height/weight table limit (${weightLbs} lbs vs. ${maxWeight} lb max), ` +
      `but your estimated body fat of ${estimatedBF}% is within the ${effectiveMaxBodyFat}% effective limit.${perfNote} ` +
      `You pass the tape test. ${biaNote}`;
  } else if (!whtrPass && !failedTape) {
    message =
      `Your WHtR of ${whtrRatio.toFixed(3)} exceeds 0.52, so a tape or BIA evaluation is required. ` +
      `Your estimated body fat of ${estimatedBF}% is within the ${effectiveMaxBodyFat}% effective limit.${perfNote} ` +
      `You pass the tape test. ${biaNote}`;
  } else {
    message =
      `You are within height/weight standards (${weightLbs} lbs vs. ${maxWeight} lb max) and WHtR ≤ 0.52.${perfNote} ` +
      `Your estimated body fat of ${estimatedBF}% is within the ${effectiveMaxBodyFat}% limit for your age group. ` +
      `You are within USMC BCP standards per MCBul 6110 / MARADMIN 066/26.`;
  }

  return {
    currentWeight: weightLbs,
    estimatedBodyFat: estimatedBF,
    passFailStatus,
    riskLevel,
    message,
    poundsToLose,
    waistToLose,
    maxAllowableWeight: maxWeight,
    maxBodyFat: baseBF,
    effectiveMaxBodyFat,
    overWeightLimit,
    tapeRequired,
    performanceExempt,
    performanceAllowance,
    bestFitnessScore,
    whtrRatio,
    whtrMaxWaist,
    whtrPass,
  };
}
