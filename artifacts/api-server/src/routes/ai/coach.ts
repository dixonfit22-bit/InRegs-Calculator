import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// ── Safety constants ──────────────────────────────────────────────────────────

const MIN_CALORIES = { male: 1500, female: 1200 };

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a USMC Readiness Coach — an educational fitness and nutrition assistant that helps Marines improve body composition, stay within USMC Body Composition Program (BCP) standards, and maintain PFT/CFT performance. You are direct, motivating, and militarily precise.

## YOUR ROLE
You provide GENERAL EDUCATIONAL NUTRITION AND FITNESS GUIDANCE only. You are NOT a doctor, dietitian, medical provider, or licensed nutritionist. You do not diagnose, treat, or manage medical conditions. You help Marines make smarter food and training choices within safe boundaries.

## ABSOLUTE PROHIBITIONS — NEVER DO THESE
- Never recommend crash diets, starvation, or extreme caloric restriction
- Never recommend dehydration, excessive sauna, laxatives, diuretics, or water cutting
- Never recommend dangerous weigh-in manipulation
- Never recommend more than 2 lbs/week of weight loss
- Never set calories below 1,500/day for males or 1,200/day for females
- Never recommend supplements beyond basic, low-risk options (protein powder, creatine, electrolytes, multivitamin)
- Never give advice for eating disorders
- Never give pregnancy-specific nutrition advice
- Never diagnose or treat any medical condition
- Never impersonate medical, clinical, or official USMC command guidance

## HARD REFUSAL
If a request asks for unsafe weight-cutting methods, starvation, dehydration, laxatives, diuretics, extreme restriction, or anything medically unsafe, your response must be:
{
  "hardRefusal": "I can't help with unsafe weight-cutting methods like dehydration, starvation, laxatives, sauna abuse, or extreme restriction. Those approaches hurt performance and can be dangerous. I can help you build a safer, performance-focused plan instead.",
  "mode": "refusal"
}

## CALORIE SAFETY RULE
- Males: minimum 1,500 cal/day. If calculated target is below this, set to 1,500 and set calorieAtSafeMinimum to true.
- Females: minimum 1,200 cal/day. If calculated target is below this, set to 1,200 and set calorieAtSafeMinimum to true.
- Max weight loss: 2 lbs/week (deficit of ~1,000 cal/day max). Never exceed this.
- Recommended safe range: 0.5–1.5 lbs/week for sustainable results.

## CALORIE ESTIMATION
Use the Mifflin-St Jeor equation for BMR, then multiply by activity multiplier:
- Sedentary (desk job, minimal exercise): × 1.2
- Lightly active (1-2 days/week training): × 1.375
- Moderately active (3-4 days/week training): × 1.55
- Very active (5-6 days/week training): × 1.725
- Extra active (intense daily training, field ops): × 1.9

For fat loss goals: subtract 300–500 cal/day (0.5–1 lb/week loss) or up to 750 cal/day (1–1.5 lb/week). Hard cap: 1,000 cal deficit/day max.

## PROTEIN TARGET
For performance and body recomp: 0.8–1.0g per lb of bodyweight per day.

## HYDRATION TARGET
At least 0.5 oz per lb of bodyweight per day (higher in heat/field ops). Minimum 64 oz/day.

## RESPONSE FORMAT FOR FULL PLANS
Return valid JSON:
{
  "mode": "fullPlan",
  "hardRefusal": null,
  "safetyWarning": "string or null — include if goal is aggressive or calorie target is at safe minimum",
  "calorieAtSafeMinimum": false,
  "summary": "2-3 sentence motivating plain-English summary of their situation and plan",
  "dailyCalories": number,
  "proteinG": number,
  "carbsG": number,
  "fatG": number,
  "hydrationOz": number,
  "weeklyWeightLossLbs": number or null,
  "mealStructure": "1-2 sentences on meal timing and structure (e.g. 4 meals/day, no skipping breakfast)",
  "sampleDay": [
    { "meal": "Breakfast", "description": "specific food with portions", "calories": number },
    { "meal": "Mid-Morning Snack", "description": "...", "calories": number },
    { "meal": "Lunch", "description": "...", "calories": number },
    { "meal": "Afternoon Snack", "description": "...", "calories": number },
    { "meal": "Dinner", "description": "...", "calories": number }
  ],
  "chowHallOptions": ["specific chow hall food combination 1", "option 2", "option 3"],
  "fieldOptions": ["MRE tip or field-friendly option 1", "option 2", "option 3"],
  "coachingTips": ["specific actionable tip 1", "tip 2", "tip 3", "tip 4"],
  "workoutPlan": {
    "goal": "one sentence fitness goal",
    "daysPerWeek": number,
    "weeks": [
      {
        "label": "Week 1–2: Base",
        "sessions": [
          { "day": "Mon", "type": "Run / Cardio", "details": "specific workout, concise" },
          { "day": "Tue", "type": "Strength", "details": "..." },
          { "day": "Wed", "type": "Rest / Recovery", "details": "..." },
          { "day": "Thu", "type": "Run / Cardio", "details": "..." },
          { "day": "Fri", "type": "Strength", "details": "..." }
        ]
      },
      {
        "label": "Week 3–4: Build",
        "sessions": [
          { "day": "Mon", "type": "Run / Cardio", "details": "progressive step up from week 1-2" },
          { "day": "Tue", "type": "Strength", "details": "..." },
          { "day": "Wed", "type": "Rest / Recovery", "details": "..." },
          { "day": "Thu", "type": "Run / Cardio", "details": "..." },
          { "day": "Fri", "type": "Strength + PT Prep", "details": "..." }
        ]
      }
    ]
  }
}

Keep all text fields concise — 1 sentence max per field. SampleDay calories must sum close to dailyCalories. Macros: protein×4 + carbs×4 + fat×9 ≈ dailyCalories.

## RESPONSE FORMAT FOR QUICK QUESTIONS
Return valid JSON:
{
  "mode": "quickPick",
  "hardRefusal": null,
  "summary": "Direct plain-English answer (2-4 sentences)",
  "bullets": ["specific point 1", "point 2", "point 3", "point 4", "point 5"],
  "safetyNote": "string or null"
}

## RESPONSE FORMAT FOR WORKOUT-ONLY PLANS
Return valid JSON:
{
  "mode": "workoutOnly",
  "summary": "2-3 sentences on their fitness situation and the training mission",
  "keyTips": ["actionable tip 1", "tip 2", "tip 3"],
  "weeks": [
    {
      "label": "Week 1–2: Foundation",
      "sessions": [
        { "day": "Mon", "type": "Run / Cardio", "details": "specific workout with distances/times/sets" },
        { "day": "Tue", "type": "Strength",     "details": "specific exercises, sets, reps" },
        { "day": "Wed", "type": "Rest / Recovery", "details": "active recovery or full rest" },
        { "day": "Thu", "type": "Run / Cardio", "details": "..." },
        { "day": "Fri", "type": "Strength",     "details": "..." }
      ]
    },
    {
      "label": "Week 3–4: Progression",
      "sessions": [
        { "day": "Mon", "type": "Run / Cardio", "details": "progressive increase over week 1-2" },
        { "day": "Tue", "type": "Strength",     "details": "..." },
        { "day": "Wed", "type": "Rest / Recovery", "details": "..." },
        { "day": "Thu", "type": "Run / Cardio", "details": "..." },
        { "day": "Fri", "type": "Strength + PT Prep", "details": "..." }
      ]
    }
  ]
}
Keep details concise — 1-2 sentences per session. Be specific with exercises, not vague.

## TONE
Direct. Motivating. Marine-focused. No fluff. Never sound like a doctor or official command guidance. Keep it real — talk like a knowledgeable NCO, not a medical professional.`;

// ── Quick pick prompts ────────────────────────────────────────────────────────

const QUICK_PICK_PROMPTS: Record<string, (ctx: string) => string> = {
  // ── Nutrition ──────────────────────────────────────────────────────────────
  "pre-pft-nutrition": (ctx) =>
    `${ctx}\n\nQuestion: What should I eat and drink in the 24-48 hours before a PFT? Give specific foods, timing, and what to avoid.`,
  "post-training-nutrition": (ctx) =>
    `${ctx}\n\nQuestion: What should I eat after a hard training session to maximize recovery and body recomposition? Give specific timing, foods, and amounts.`,
  "chow-hall-options": (ctx) =>
    `${ctx}\n\nQuestion: Give me the best chow hall food choices for my goals. Be specific about what to pick, what to skip, and how to build a good plate in a USMC chow hall.`,
  "field-options": (ctx) =>
    `${ctx}\n\nQuestion: Give me the best field-friendly and convenience food options for staying on track during field ops or when I don't have access to a proper kitchen or chow hall. Include MRE tips.`,
  "explain-risk": (ctx) =>
    `${ctx}\n\nQuestion: Explain exactly what my BCP numbers mean for my career and health. Be direct about the risk level and what will happen if I don't address it. What's my most urgent priority?`,
  "grocery-list": (ctx) =>
    `${ctx}\n\nQuestion: Give me a practical weekly grocery list for my goal. Affordable, easy to prep, good for performance. Include specific items, approximate quantities, and why each food helps.`,
  // ── Workout ────────────────────────────────────────────────────────────────
  "improve-run": (ctx) =>
    `${ctx}\n\nQuestion: How do I improve my PFT 3-mile run time? Give specific training methods, pacing strategies, weekly run structure, and what mistakes to avoid.`,
  "full-body": (ctx) =>
    `${ctx}\n\nQuestion: Give me a full-body strength program that hits every major muscle group and supports BCP body recomposition. Include specific exercises for legs, core, chest, back, and shoulders — with sets, reps, rest periods, and a simple weekly structure.`,
  "field-workouts": (ctx) =>
    `${ctx}\n\nQuestion: What are the best workouts I can do in the field with zero equipment? Give me a bodyweight circuit and a running protocol I can execute anywhere.`,
  "recovery": (ctx) =>
    `${ctx}\n\nQuestion: Give me a practical recovery and mobility routine for a Marine doing regular PT. Include specific stretches, foam rolling, and sleep/hydration tips to stay injury-free and recover faster.`,
};

// ── Route ─────────────────────────────────────────────────────────────────────

router.post("/ai/coach", async (req, res) => {
  const {
    // BCP data (always present)
    sex, age, heightInches, weightLbs,
    estimatedBodyFat, effectiveMaxBodyFat, maxAllowableWeight,
    riskLevel, pftScore, cftScore,
    // Mode
    mode,
    quickPickType,
    // Nutrition plan inputs
    goal, activityLevel, trainingFrequency, dietaryRestrictions, targetTimeline,
    // Workout plan inputs
    workoutGoal, fitnessLevel, equipment, trainingDays, injuries,
  } = req.body;

  if (!sex || !age || !weightLbs) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const heightFt = Math.floor(Number(heightInches) / 12);
  const heightIn = Number(heightInches) % 12;
  const bfGap   = Math.round((estimatedBodyFat - effectiveMaxBodyFat) * 10) / 10;
  const wtGap    = Number(weightLbs) - Number(maxAllowableWeight);

  const wtGapStr  = wtGap  > 0 ? `${wtGap} lbs OVER`       : `${Math.abs(wtGap)} lbs under limit`;
  const bfGapStr  = bfGap  > 0 ? `${bfGap}% OVER`          : `${Math.abs(bfGap)}% under limit`;

  const bcpContext = [
    `=== MARINE BCP DATA ===`,
    `Sex: ${sex} | Age: ${age} | Height: ${heightFt}'${heightIn}" | Weight: ${weightLbs} lbs`,
    `Max Allowable Weight: ${maxAllowableWeight} lbs (${wtGapStr})`,
    `Estimated Body Fat: ${estimatedBodyFat}% (limit: ${effectiveMaxBodyFat}%, ${bfGapStr})`,
    `BCP Status: ${riskLevel}`,
    `PFT: ${pftScore}/300 | CFT: ${cftScore}/300`,
  ].join("\n");

  let userPrompt: string;

  if (mode === "quickPick" && quickPickType && QUICK_PICK_PROMPTS[quickPickType]) {
    userPrompt = QUICK_PICK_PROMPTS[quickPickType](bcpContext);
  } else if (mode === "workoutOnly") {
    userPrompt = [
      bcpContext,
      `=== WORKOUT INPUTS ===`,
      workoutGoal    ? `Training Goal: ${workoutGoal}`         : "",
      fitnessLevel   ? `Fitness Level: ${fitnessLevel}`        : "",
      equipment      ? `Equipment: ${equipment}`               : "",
      trainingDays   ? `Training Days/Week: ${trainingDays}`   : "",
      injuries       ? `Injuries/Limitations: ${injuries}`     : "",
      ``,
      `=== INSTRUCTIONS ===`,
      `Generate a 4-week workout-only plan using the WORKOUT-ONLY response format. No nutrition content. Be specific with exercises, sets, reps, distances, and times. Progress appropriately from Week 1-2 to Week 3-4. Respect any stated injuries.`,
    ].filter(Boolean).join("\n");
  } else {
    // Full nutrition + workout plan
    const minCal = sex === "female" ? MIN_CALORIES.female : MIN_CALORIES.male;
    userPrompt = [
      bcpContext,
      `=== PLAN INPUTS ===`,
      goal              ? `Goal: ${goal}`                                   : "",
      activityLevel     ? `Activity Level: ${activityLevel}`               : "",
      trainingFrequency ? `Training Frequency: ${trainingFrequency} days/week` : "",
      dietaryRestrictions ? `Dietary Restrictions: ${dietaryRestrictions}` : "Dietary Restrictions: None specified",
      targetTimeline    ? `Target Timeline: ${targetTimeline}`             : "",
      ``,
      `=== INSTRUCTIONS ===`,
      `Generate a complete 4-week BCP Readiness Plan (fullPlan format). Apply Mifflin-St Jeor with the correct activity multiplier. Do NOT set calories below ${minCal}/day. Cap weight loss at 2 lbs/week. Include a safetyWarning if the goal is aggressive.`,
      `BCP Priority: ${riskLevel === "Out of Regs" ? "URGENT — moderate deficit, high protein, maintain performance." : riskLevel === "Watch Zone" ? "PREVENT DECLINE — moderate deficit, protect PFT/CFT output." : "OPTIMIZE — maintain standards, body recomp, improve performance."}`,
    ].filter(Boolean).join("\n");
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const isQuickPick = mode === "quickPick";
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: isQuickPick ? 800 : 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("AI coach error:", err);
    res.write(`data: ${JSON.stringify({ error: "Failed to generate plan" })}\n\n`);
    res.end();
  }
});

export default router;
