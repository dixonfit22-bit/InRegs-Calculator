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
}

const WAIST_INCHES_PER_BF_PCT = 0.9;

export function calculateRegStatus(input: MarineInput): RegResult {
  const { sex, age, heightInches, weightLbs, neckInches, waistInches, hipInches, pftScore, cftScore } = input;

  // --- Standards lookup ---
  const maxWeight = getMaxAllowableWeight(sex, heightInches);
  const baseBF = getMaxAllowableBodyFat(sex, age);
  const estimatedBF = estimateBodyFatPct(sex, heightInches, neckInches, waistInches, hipInches);

  // --- Performance exemption / allowance (MCBul 6110, para 4.a.(2)(f)) ---
  // Use the higher of PFT or CFT score.
  const bestFitnessScore = Math.max(pftScore, cftScore);
  const performanceExempt = bestFitnessScore >= PERFORMANCE.EXEMPTION_SCORE;
  const performanceAllowance = !performanceExempt && bestFitnessScore >= PERFORMANCE.ALLOWANCE_SCORE;
  const effectiveMaxBodyFat = baseBF + (performanceAllowance ? PERFORMANCE.ALLOWANCE_BF_PCT : 0);

  // --- Pass/Fail ---
  // USMC BCP logic: tape is only administered when over height/weight table.
  // Fail only if over weight table AND over effective BF standard.
  // A 285 PFT/CFT score = MCBCMAP exempt (auto-pass regardless of BF).
  const overWeightLimit = weightLbs > maxWeight;
  const overBFLimit = estimatedBF > effectiveMaxBodyFat;
  const tapeRequired = overWeightLimit;
  const failedTape = tapeRequired && overBFLimit;
  const isFailing = failedTape && !performanceExempt;

  // --- Reduction estimates ---
  const poundsToLose = overWeightLimit && !performanceExempt ? Math.ceil(weightLbs - maxWeight) : null;
  const waistToLose = isFailing
    ? Math.ceil((estimatedBF - effectiveMaxBodyFat) * WAIST_INCHES_PER_BF_PCT)
    : null;

  // --- Watch Zone ---
  const nearWeightLimit = !overWeightLimit && weightLbs >= maxWeight - WATCH_ZONE.WEIGHT_LBS;
  const nearBFLimit = !overBFLimit && estimatedBF >= effectiveMaxBodyFat - WATCH_ZONE.BODY_FAT_PCT;
  const isWatchZone = !isFailing && !performanceExempt && (nearWeightLimit || nearBFLimit);

  const riskLevel: RegResult['riskLevel'] = isFailing
    ? 'Out of Regs'
    : isWatchZone
    ? 'Watch Zone'
    : 'In Regs';

  const passFailStatus: 'PASS' | 'FAIL' = isFailing ? 'FAIL' : 'PASS';

  // --- Plain-English message ---
  let message = '';
  const biaNote = 'Note: circumference (tape) results are a screening estimate only. Formal BCP assignment requires BIA verification using the InBody 770.';

  if (performanceExempt) {
    message =
      `Your PFT/CFT score of ${bestFitnessScore} meets the 285-point threshold, granting MCBCMAP exemption per MCBul 6110. ` +
      `You are exempt from Body Composition Program assignment regardless of height/weight or body fat results.`;
  } else if (riskLevel === 'Out of Regs') {
    const allowanceNote = performanceAllowance
      ? ` Your ${bestFitnessScore} PFT/CFT score applied a +1% body fat allowance (effective limit: ${effectiveMaxBodyFat}%).`
      : '';
    message =
      `You are over the weight table limit (${weightLbs} lbs vs. ${maxWeight} lb max) ` +
      `and your estimated body fat of ${estimatedBF}% exceeds the ${effectiveMaxBodyFat}% effective limit for your age group.${allowanceNote} ` +
      `Both conditions must be resolved before your next official weigh-in. See recommendations below. ` +
      biaNote;
  } else if (riskLevel === 'Watch Zone') {
    const reasons: string[] = [];
    if (nearWeightLimit)
      reasons.push(`weight (${weightLbs} lbs — only ${maxWeight - weightLbs} lbs under the ${maxWeight} lb limit)`);
    if (nearBFLimit)
      reasons.push(`estimated body fat (${estimatedBF}% — only ${(effectiveMaxBodyFat - estimatedBF).toFixed(1)}% under the ${effectiveMaxBodyFat}% limit)`);
    const allowanceNote = performanceAllowance ? ` Your ${bestFitnessScore} PFT/CFT score applied a +1% body fat allowance.` : '';
    message =
      `You're in the Watch Zone for your ${reasons.join(' and ')}.${allowanceNote} ` +
      `You're technically within standards but close to the edge. Now is the time to tighten up before weigh-in. ` +
      biaNote;
  } else if (overWeightLimit && !failedTape) {
    const allowanceNote = performanceAllowance
      ? ` Your ${bestFitnessScore} PFT/CFT score applied a +1% body fat allowance (effective limit: ${effectiveMaxBodyFat}%).`
      : '';
    message =
      `You are over the height/weight table limit (${weightLbs} lbs vs. ${maxWeight} lb max), ` +
      `but your estimated body fat of ${estimatedBF}% is within the ${effectiveMaxBodyFat}% effective limit for your age group.${allowanceNote} ` +
      `You pass the tape test. ${biaNote}`;
  } else {
    const allowanceNote = performanceAllowance
      ? ` Your ${bestFitnessScore} PFT/CFT score applied a +1% body fat allowance (effective limit: ${effectiveMaxBodyFat}%).`
      : '';
    message =
      `You are within height/weight standards (${weightLbs} lbs vs. ${maxWeight} lb max) ` +
      `and your estimated body fat of ${estimatedBF}% is within the ${effectiveMaxBodyFat}% limit for your age group.${allowanceNote} ` +
      `You are currently within USMC BCP standards per MCBul 6110 (20 Dec 2024).`;
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
  };
}
