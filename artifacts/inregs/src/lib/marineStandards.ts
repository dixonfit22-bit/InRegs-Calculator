/**
 * marineStandards.ts — Calculator Engine
 *
 * Contains only calculation logic. All numeric thresholds live in usmcStandards.ts.
 */

import {
  Sex,
  getMaxAllowableWeight,
  getMaxAllowableBodyFat,
  estimateBodyFatPct,
  WATCH_ZONE,
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
  overWeightLimit: boolean;
  tapeRequired: boolean;
}

const WAIST_INCHES_PER_BF_PCT = 0.9;

export function calculateRegStatus(input: MarineInput): RegResult {
  const { sex, age, heightInches, weightLbs, neckInches, waistInches, hipInches } = input;

  const maxWeight = getMaxAllowableWeight(sex, heightInches);
  const maxBF = getMaxAllowableBodyFat(sex, age);
  const estimatedBF = estimateBodyFatPct(sex, heightInches, neckInches, waistInches, hipInches);

  const overWeightLimit = weightLbs > maxWeight;
  const overBFLimit = estimatedBF > maxBF;
  const tapeRequired = overWeightLimit;
  const failedTape = tapeRequired && overBFLimit;
  const isFailing = failedTape;

  const poundsToLose = overWeightLimit ? Math.ceil(weightLbs - maxWeight) : null;
  const waistToLose = failedTape
    ? Math.ceil((estimatedBF - maxBF) * WAIST_INCHES_PER_BF_PCT)
    : null;

  const nearWeightLimit = !overWeightLimit && weightLbs >= maxWeight - WATCH_ZONE.WEIGHT_LBS;
  const nearBFLimit = !overBFLimit && estimatedBF >= maxBF - WATCH_ZONE.BODY_FAT_PCT;
  const isWatchZone = !isFailing && (nearWeightLimit || nearBFLimit);

  const riskLevel: RegResult['riskLevel'] = isFailing
    ? 'Out of Regs'
    : isWatchZone
    ? 'Watch Zone'
    : 'In Regs';

  const passFailStatus: 'PASS' | 'FAIL' = isFailing ? 'FAIL' : 'PASS';

  let message = '';

  if (riskLevel === 'Out of Regs') {
    message =
      `You are over the weight table limit (${weightLbs} lbs vs. ${maxWeight} lb max) ` +
      `and your estimated body fat of ${estimatedBF}% exceeds the ${maxBF}% limit for your age group. ` +
      `Both conditions must be resolved before your next official weigh-in. See recommendations below. ` +
      `These are estimates only — verify with your unit's official weigh-in procedures.`;
  } else if (riskLevel === 'Watch Zone') {
    const reasons: string[] = [];
    if (nearWeightLimit)
      reasons.push(
        `weight (${weightLbs} lbs — only ${maxWeight - weightLbs} lbs under the ${maxWeight} lb limit)`
      );
    if (nearBFLimit)
      reasons.push(
        `estimated body fat (${estimatedBF}% — only ${(maxBF - estimatedBF).toFixed(1)}% under the ${maxBF}% limit)`
      );
    message =
      `You're in the Watch Zone for your ${reasons.join(' and ')}. ` +
      `You're technically within standards but close to the edge. ` +
      `Now is the time to tighten up before weigh-in. ` +
      `Results are estimates — verify against current USMC guidance.`;
  } else if (overWeightLimit && !failedTape) {
    message =
      `You are over the height/weight table limit (${weightLbs} lbs vs. ${maxWeight} lb max), ` +
      `but your estimated body fat of ${estimatedBF}% is within the ${maxBF}% limit for your age group. ` +
      `You pass the tape test. Confirm with an official weigh-in — these are estimates only.`;
  } else {
    message =
      `You are within height/weight standards (${weightLbs} lbs vs. ${maxWeight} lb max) ` +
      `and your estimated body fat of ${estimatedBF}% is within the ${maxBF}% limit for your age group. ` +
      `You are currently within USMC BCP standards. Results are estimates — verify against current MCO 6100.13A.`;
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
    maxBodyFat: maxBF,
    overWeightLimit,
    tapeRequired,
  };
}
