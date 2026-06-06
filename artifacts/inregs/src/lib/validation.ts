export interface FormData {
  sex: string;
  age: string;
  heightInches: string;
  weightLbs: string;
  neckInches: string;
  waistInches: string;
  hipInches: string;
  pftScore: string;
  cftScore: string;
}

export type ValidationErrors = Partial<Record<keyof FormData, string>>;

export function validateInputs(form: FormData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!form.sex) {
    errors.sex = 'Sex is required';
  }

  const age = Number(form.age);
  if (!form.age || isNaN(age) || age < 17 || age > 65) {
    errors.age = 'Age must be between 17 and 65';
  }

  const height = Number(form.heightInches);
  if (!form.heightInches || isNaN(height) || height < 50 || height > 90) {
    errors.heightInches = 'Height must be between 50 and 90 inches';
  }

  const weight = Number(form.weightLbs);
  if (!form.weightLbs || isNaN(weight) || weight < 80 || weight > 350) {
    errors.weightLbs = 'Weight must be between 80 and 350 lbs';
  }

  const neck = Number(form.neckInches);
  if (!form.neckInches || isNaN(neck) || neck < 8 || neck > 30) {
    errors.neckInches = 'Neck must be between 8 and 30 inches';
  }

  const waist = Number(form.waistInches);
  if (!form.waistInches || isNaN(waist) || waist < 20 || waist > 70) {
    errors.waistInches = 'Waist must be between 20 and 70 inches';
  }

  if (form.sex === 'female') {
    const hip = Number(form.hipInches);
    if (!form.hipInches || isNaN(hip) || hip < 20 || hip > 80) {
      errors.hipInches = 'Hip must be between 20 and 80 inches';
    }
  }

  const pft = Number(form.pftScore);
  if (!form.pftScore || isNaN(pft) || pft < 0 || pft > 300) {
    errors.pftScore = 'PFT score must be between 0 and 300';
  }

  const cft = Number(form.cftScore);
  if (!form.cftScore || isNaN(cft) || cft < 0 || cft > 300) {
    errors.cftScore = 'CFT score must be between 0 and 300';
  }

  return errors;
}
