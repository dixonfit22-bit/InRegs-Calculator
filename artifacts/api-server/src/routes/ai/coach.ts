import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.post("/ai/coach", async (req, res) => {
  const { sex, age, heightInches, weightLbs, estimatedBodyFat, effectiveMaxBodyFat,
          maxAllowableWeight, riskLevel, pftScore, cftScore } = req.body;

  if (!sex || !age || !weightLbs || !estimatedBodyFat) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const bfGap = Math.round((estimatedBodyFat - effectiveMaxBodyFat) * 10) / 10;
  const weightGap = Number(weightLbs) - Number(maxAllowableWeight);
  const heightFt = Math.floor(Number(heightInches) / 12);
  const heightIn = Number(heightInches) % 12;

  const situationSummary = [
    `Sex: ${sex}, Age: ${age}`,
    `Height: ${heightFt}'${heightIn}", Weight: ${weightLbs} lbs (limit: ${maxAllowableWeight} lbs, gap: ${weightGap > 0 ? `${weightGap} lbs OVER` : `${Math.abs(weightGap)} lbs under`})`,
    `Body Fat: ${estimatedBodyFat}% estimated (limit: ${effectiveMaxBodyFat}%, gap: ${bfGap > 0 ? `${bfGap}% OVER` : `${Math.abs(bfGap)}% under`})`,
    `BCP Status: ${riskLevel}`,
    `PFT Score: ${pftScore}/300, CFT Score: ${cftScore}/300`,
  ].join("\n");

  const systemPrompt = `You are an elite USMC fitness and nutrition coach. You specialize in helping Marines pass the Body Composition Program (BCP). You are direct, motivating, and militarily precise. You do not sugarcoat. You give specific, actionable plans.

Format your entire response as valid JSON with this exact structure:
{
  "summary": "2-3 sentence motivational summary of their situation and mission",
  "weeklyMealPlan": {
    "dailyCalories": number,
    "proteinG": number,
    "carbsG": number,
    "fatG": number,
    "rationale": "1-2 sentences explaining the macro split and why",
    "days": [
      {
        "day": "Monday",
        "meals": [
          { "name": "Breakfast", "description": "specific meal with approximate portions", "calories": number },
          { "name": "Lunch", "description": "specific meal with approximate portions", "calories": number },
          { "name": "Dinner", "description": "specific meal with approximate portions", "calories": number },
          { "name": "Snacks", "description": "1-2 snack options", "calories": number }
        ]
      }
    ]
  },
  "workoutPlan": {
    "goal": "primary fitness goal in one sentence",
    "daysPerWeek": number,
    "weeks": [
      {
        "label": "Week 1-2: Base Building",
        "sessions": [
          { "day": "Monday", "type": "Run / Cardio", "details": "specific workout with sets, reps, distances, times" },
          { "day": "Tuesday", "type": "Strength", "details": "..." },
          { "day": "Wednesday", "type": "Rest / Active Recovery", "details": "..." },
          { "day": "Thursday", "type": "Run / Cardio", "details": "..." },
          { "day": "Friday", "type": "Strength", "details": "..." },
          { "day": "Saturday", "type": "Long Run / PT", "details": "..." },
          { "day": "Sunday", "type": "Rest", "details": "Full rest or light stretching" }
        ]
      },
      {
        "label": "Week 3-4: Intensify",
        "sessions": [ ... same structure ... ]
      }
    ]
  },
  "keyTips": ["tip 1", "tip 2", "tip 3", "tip 4"]
}

Provide exactly 7 days in the meal plan (Mon–Sun). Include 2 workout phases (Week 1-2, Week 3-4). Be specific with foods and exercises — no vague advice. Calories must be mathematically consistent with macros (protein 4 cal/g, carbs 4 cal/g, fat 9 cal/g). All meals' calories must add up close to dailyCalories.`;

  const userPrompt = `Generate a complete 4-week BCP recovery plan for this Marine:\n\n${situationSummary}\n\nPriority: ${riskLevel === "Out of Regs" ? "URGENT — needs to pass BCP ASAP. Aggressive caloric deficit, high protein." : riskLevel === "Watch Zone" ? "MODERATE — prevent watch zone from worsening, gradual fat loss while maintaining performance." : "MAINTAIN — stay in regs, maintain PFT/CFT performance, optimize body composition."}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    let fullResponse = "";
    const stream = await openai.chat.completions.create({
      model: "gpt-5",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
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
