import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { healthProfile, weeklyFoodLog } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating personalized diet from 7-day food log...");

    const systemPrompt = `You are a professional nutritionist. Based on the user's health profile AND their actual eating patterns from the past 7 days, create a highly personalized diet plan.

IMPORTANT: Respond with ONLY valid JSON, no markdown, no code blocks.

The JSON must have this exact structure:
{
  "summary": "Brief analysis of their current eating habits",
  "improvements": ["improvement1", "improvement2"],
  "totalCalories": number,
  "meals": [
    {
      "name": "Meal Name (e.g., Breakfast)",
      "time": "Time (e.g., 8:00 AM)",
      "calories": number,
      "description": "Brief description",
      "foods": ["food1", "food2", "food3"]
    }
  ],
  "tips": ["tip1", "tip2", "tip3"],
  "weeklyPlan": {
    "day1": "Brief day overview",
    "day2": "Brief day overview",
    "day3": "Brief day overview",
    "day4": "Brief day overview",
    "day5": "Brief day overview",
    "day6": "Brief day overview",
    "day7": "Brief day overview"
  }
}

Analyze their 7-day eating patterns to:
- Identify their food preferences
- Spot nutritional gaps
- Create a realistic plan they can follow
- Incorporate foods they already enjoy
- Suggest healthier alternatives where needed`;

    // Format the weekly food log for the AI
    const formattedLog = weeklyFoodLog.map((entry: any) => ({
      day: entry.day_number,
      meal: entry.meal_type,
      food: entry.food_name || "Unknown",
      calories: entry.calories || 0,
      protein: entry.protein || 0,
      carbs: entry.carbs || 0,
      fat: entry.fat || 0,
      aiAnalysis: entry.ai_analysis || null,
    }));

    const userPrompt = `Create a personalized diet plan based on this user's profile and their 7-day eating history:

HEALTH PROFILE:
- Gender: ${healthProfile.gender}
- Age: ${healthProfile.age} years
- Weight: ${healthProfile.weight} kg
- Target Weight: ${healthProfile.target_weight} kg
- Height: ${healthProfile.height} cm
- Goal: ${healthProfile.goal}
- Activity Level: ${healthProfile.activity_level}
- Diet Preference: ${healthProfile.diet_preference}
- Meals Per Day: ${healthProfile.meals_per_day}
- Food Allergies: ${healthProfile.food_allergies?.join(", ") || "None"}
- Medical Conditions: ${healthProfile.medical_conditions?.join(", ") || "None"}
- Liked Foods: ${healthProfile.liked_foods?.join(", ") || "No preferences"}
- Disliked Foods: ${healthProfile.disliked_foods?.join(", ") || "No preferences"}

7-DAY FOOD LOG:
${JSON.stringify(formattedLog, null, 2)}

Based on their actual eating patterns and health goals, create a realistic and personalized diet plan.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("Generated personalized diet plan");

    // Parse the JSON response
    let diet;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      diet = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse diet JSON:", content);
      throw new Error("Failed to parse diet response");
    }

    return new Response(JSON.stringify({ diet }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-personalized-diet function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate diet";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
