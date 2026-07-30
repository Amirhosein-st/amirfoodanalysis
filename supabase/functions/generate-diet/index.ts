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
    const { healthProfile, weeklyFoodLogs, isPersonalized, previousMeals, regenerateMeal, recipeRequest } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt: string;
    let userPrompt: string;
    const previousFoods = Array.isArray(previousMeals)
      ? previousMeals.flatMap((meal: unknown) => {
          if (!meal || typeof meal !== "object") return [];
          const savedMeal = meal as { optionName?: unknown; foods?: unknown };
          const foods = Array.isArray(savedMeal.foods)
            ? savedMeal.foods.filter((food): food is string => typeof food === "string")
            : [];
          return typeof savedMeal.optionName === "string"
            ? [savedMeal.optionName, ...foods]
            : foods;
        })
      : [];
    const previousFoodsSummary = previousFoods.length > 0
      ? `\nFOODS FROM THE PREVIOUS PLAN (do not repeat these unless medically necessary):\n- ${[...new Set(previousFoods)].join("\n- ")}\n`
      : "";
    const variationSeed = crypto.randomUUID();

    if (recipeRequest?.name) {
      systemPrompt = `You are a practical home-cooking recipe assistant.
Return ONLY valid JSON with this exact structure:
{
  "recipe": {
    "name": "Recipe name",
    "servings": number,
    "prepTime": "e.g. 15 minutes",
    "cookTime": "e.g. 30 minutes",
    "ingredients": [
      { "item": "Ingredient name", "amount": "Exact practical quantity" }
    ],
    "steps": ["Clear step 1", "Clear step 2"],
    "notes": ["Optional useful note"]
  }
}

Create a complete, realistic recipe for the requested dish. Use the supplied foods as guidance, include sensible quantities, and keep the preparation aligned with the user's dietary restrictions. Do not include markdown.`;

      userPrompt = `Create a recipe for:
- Dish: ${recipeRequest.name}
- Description: ${recipeRequest.description || "Not provided"}
- Suggested foods: ${Array.isArray(recipeRequest.foods) ? recipeRequest.foods.join(", ") : "Not provided"}
- Target calories per serving: ${recipeRequest.calories || "Not specified"}
- Nationality/cuisine: ${healthProfile.nationality || "Not specified"}
- Diet preference: ${healthProfile.diet_preference || "Not specified"}
- Allergies: ${healthProfile.food_allergies?.join(", ") || "None"}
- Medical conditions: ${healthProfile.medical_conditions?.join(", ") || "None"}

Provide an easy-to-follow home recipe. Variation seed: ${variationSeed}.`;
    } else if (regenerateMeal?.name) {
      systemPrompt = `You are a professional nutritionist regenerating one meal in an existing diet plan.
Return ONLY valid JSON with this exact structure:
{
  "meal": {
    "name": "The supplied meal type",
    "time": "The supplied time",
    "targetCalories": number,
    "options": [
      { "name": "Specific dish name", "calories": number, "description": "Brief description", "foods": ["ingredient or side"] },
      { "name": "Different specific dish name", "calories": number, "description": "Brief description", "foods": ["ingredient or side"] },
      { "name": "Third different specific dish name", "calories": number, "description": "Brief description", "foods": ["ingredient or side"] }
    ]
  }
}

STRICT REQUIREMENTS:
- Return exactly 3 genuinely different options
- Never repeat any excluded dish, food, main ingredient, or close variation
- Keep every option close to the supplied calorie target
- Respect nationality, diet preference, allergies, disliked foods, medical conditions, and goal
- Prefer authentic dishes from the user's culture, but vary ingredients and cooking methods
- The three options must also be different from one another`;

      userPrompt = `Regenerate fresh options for this meal:
- Meal: ${regenerateMeal.name}
- Time: ${regenerateMeal.time || "Not specified"}
- Target calories: ${regenerateMeal.targetCalories || "Use an appropriate target"}
- Nationality: ${healthProfile.nationality || "Not specified"}
- Goal: ${healthProfile.goal}
- Diet preference: ${healthProfile.diet_preference}
- Allergies: ${healthProfile.food_allergies?.join(", ") || "None"}
- Medical conditions: ${healthProfile.medical_conditions?.join(", ") || "None"}
- Liked foods: ${healthProfile.liked_foods?.join(", ") || "No preferences"}
- Disliked foods: ${healthProfile.disliked_foods?.join(", ") || "None"}
${previousFoodsSummary}
Variation seed: ${variationSeed}. Generate a new set, not a paraphrase of excluded foods.`;
    } else if (isPersonalized && weeklyFoodLogs && weeklyFoodLogs.length > 0) {
      // Personalized diet based on 7-day food logs
      systemPrompt = `You are a professional nutritionist. You will analyze the user's eating habits from their 7-day food log and create a highly personalized diet plan that:
      1. Takes into account their current eating patterns and preferences
      2. Gradually improves their diet while respecting their tastes
      3. Considers their health goals and profile
      4. PRIORITIZES foods from their cultural background/nationality - suggest traditional and popular dishes from their cuisine
      
      IMPORTANT CALORIE DISTRIBUTION: 
      - Breakfast and Lunch should have MORE calories than Dinner and Snack
      - Recommended distribution: Breakfast ~30%, Lunch ~35%, Dinner ~25%, Snack ~10%
      - Front-load calories earlier in the day for better metabolism and energy
      
      CULTURAL FOOD FOCUS:
      - Suggest meals that are common and traditional in the user's nationality/culture
      - Adapt healthy eating to their cultural food preferences
      - Include authentic dishes with healthy modifications when needed

      VARIETY REQUIREMENTS:
      - Return exactly 3 genuinely different options for every meal
      - Do not repeat a main dish, protein, or combination between options or meals
      - Avoid every food listed from the previous plan
      - Use varied ingredients, cooking methods, and traditional dishes
      - Liked foods are preferences, not ingredients that must appear in every plan
      
      IMPORTANT: You must respond with ONLY a valid JSON object, no markdown, no code blocks, just pure JSON.
      
      The JSON must have this exact structure:
      {
        "totalCalories": number,
        "analysis": {
          "currentHabits": "Brief analysis of their current eating habits",
          "improvements": ["improvement1", "improvement2", "improvement3"],
          "strengths": ["strength1", "strength2"]
        },
        "meals": [
          {
            "name": "Meal Name (e.g., Breakfast)",
            "time": "Time (e.g., 8:00 AM)",
            "targetCalories": number,
            "options": [
              {
                "name": "Specific dish or menu name",
                "calories": number,
                "description": "Brief description",
                "foods": ["ingredient or side 1", "ingredient or side 2"]
              },
              {
                "name": "A clearly different dish",
                "calories": number,
                "description": "Brief description",
                "foods": ["ingredient or side 1", "ingredient or side 2"]
              },
              {
                "name": "A third clearly different dish",
                "calories": number,
                "description": "Brief description",
                "foods": ["ingredient or side 1", "ingredient or side 2"]
              }
            ],
            "basedOn": "Which of their logged meals this is based on or inspired by"
          }
        ],
        "tips": ["personalized tip1", "personalized tip2", "personalized tip3"]
      }`;

      // Organize food logs by day
      const logsByDay: Record<number, any[]> = {};
      weeklyFoodLogs.forEach((log: any) => {
        if (!logsByDay[log.day_number]) {
          logsByDay[log.day_number] = [];
        }
        logsByDay[log.day_number].push(log);
      });

      let foodLogSummary = "7-Day Food Log:\n";
      for (let day = 1; day <= 7; day++) {
        const dayLogs = logsByDay[day] || [];
        foodLogSummary += `\nDay ${day}:\n`;
        if (dayLogs.length === 0) {
          foodLogSummary += "  No meals logged\n";
        } else {
          dayLogs.forEach((log: any) => {
            foodLogSummary += `  - ${log.meal_type}: ${log.food_name || "Unknown"} (${log.calories || "?"} cal, P: ${log.protein || 0}g, C: ${log.carbs || 0}g, F: ${log.fat || 0}g)\n`;
          });
        }
      }

      userPrompt = `Create a highly personalized diet plan based on this user's profile and their actual eating habits over 7 days:

User Profile:
- Nationality: ${healthProfile.nationality || "Not specified"} (IMPORTANT: Suggest traditional and popular foods from this culture!)
- Gender: ${healthProfile.gender}
- Age: ${healthProfile.age} years
- Weight: ${healthProfile.weight} kg
- Target Weight: ${healthProfile.target_weight} kg
- Height: ${healthProfile.height} cm
- Goal: ${healthProfile.goal}
- Activity Level: ${healthProfile.activity_level}
- Diet Preference: ${healthProfile.diet_preference}
- Meals Per Day: ${healthProfile.meals_per_day}
- Water Intake: ${healthProfile.water_intake} liters
- Sleep Hours: ${healthProfile.sleep_hours}
- Food Allergies: ${healthProfile.food_allergies?.join(", ") || "None"}
- Medical Conditions: ${healthProfile.medical_conditions?.join(", ") || "None"}
- Liked Foods: ${healthProfile.liked_foods?.join(", ") || "No preferences"}
- Disliked Foods: ${healthProfile.disliked_foods?.join(", ") || "No preferences"}

${foodLogSummary}
${previousFoodsSummary}

Analyze their eating patterns and create a personalized diet that builds on what they already eat while helping them reach their goals. PRIORITIZE foods from their ${healthProfile.nationality || "cultural"} cuisine.
Variation seed: ${variationSeed}. Use it to choose a fresh set of dishes; it is not part of the response.`;

    } else {
      // Standard diet based on health profile only
      systemPrompt = `You are a professional nutritionist. Based on the user's health profile, create a personalized daily diet plan. 
      
      IMPORTANT CALORIE DISTRIBUTION: 
      - Breakfast and Lunch should have MORE calories than Dinner and Snack
      - For 4 meals: Breakfast ~30%, Lunch ~35%, Dinner ~25%, Snack ~10%
      - For 3 meals: Breakfast ~35%, Lunch ~40%, Dinner ~25%
      - For 2 meals: Breakfast ~55%, Dinner ~45%
      - Front-load calories earlier in the day for better metabolism and energy
      
      CULTURAL FOOD FOCUS:
      - PRIORITIZE foods from the user's nationality/cultural background
      - Suggest traditional and popular dishes from their cuisine
      - Adapt healthy eating to their cultural food preferences
      - Include authentic dishes with healthy modifications when needed

      VARIETY REQUIREMENTS:
      - Return exactly 3 genuinely different options for every meal
      - Do not repeat a main dish, protein, or combination between options or meals
      - Avoid every food listed from the previous plan
      - Vary ingredients, cooking methods, and traditional dishes on each generation
      - Liked foods are preferences, not ingredients that must appear in every plan
      
      IMPORTANT: You must respond with ONLY a valid JSON object, no markdown, no code blocks, just pure JSON.
      
      The JSON must have this exact structure:
      {
        "totalCalories": number,
        "meals": [
          {
            "name": "Meal Name (e.g., Breakfast)",
            "time": "Time (e.g., 8:00 AM)",
            "targetCalories": number,
            "options": [
              {
                "name": "Specific dish or menu name",
                "calories": number,
                "description": "Brief description",
                "foods": ["ingredient or side 1", "ingredient or side 2"]
              },
              {
                "name": "A clearly different dish",
                "calories": number,
                "description": "Brief description",
                "foods": ["ingredient or side 1", "ingredient or side 2"]
              },
              {
                "name": "A third clearly different dish",
                "calories": number,
                "description": "Brief description",
                "foods": ["ingredient or side 1", "ingredient or side 2"]
              }
            ]
          }
        ],
        "tips": ["tip1", "tip2", "tip3"]
      }
      
      Consider:
      - User's nationality and cultural food preferences (MOST IMPORTANT)
      - User's goal (weight loss, muscle gain, maintenance)
      - Activity level
      - Diet preferences
      - Food allergies and medical conditions
      - Liked and disliked foods
      - Number of meals per day they prefer`;

      userPrompt = `Create a personalized diet plan for this user:
      - Nationality: ${healthProfile.nationality || "Not specified"} (IMPORTANT: Suggest traditional and popular foods from this culture!)
      - Gender: ${healthProfile.gender}
      - Age: ${healthProfile.age} years
      - Weight: ${healthProfile.weight} kg
      - Target Weight: ${healthProfile.target_weight} kg
      - Height: ${healthProfile.height} cm
      - Goal: ${healthProfile.goal}
      - Activity Level: ${healthProfile.activity_level}
      - Diet Preference: ${healthProfile.diet_preference}
      - Meals Per Day: ${healthProfile.meals_per_day}
      - Water Intake: ${healthProfile.water_intake} liters
      - Sleep Hours: ${healthProfile.sleep_hours}
      - Food Allergies: ${healthProfile.food_allergies?.join(", ") || "None"}
      - Medical Conditions: ${healthProfile.medical_conditions?.join(", ") || "None"}
      - Liked Foods: ${healthProfile.liked_foods?.join(", ") || "No preferences"}
      - Disliked Foods: ${healthProfile.disliked_foods?.join(", ") || "No preferences"}

${previousFoodsSummary}
Make sure to suggest foods that are traditional and commonly eaten in ${healthProfile.nationality || "the user's"} cuisine while keeping them healthy and aligned with their goals.
Variation seed: ${variationSeed}. Use it to choose a fresh set of dishes; it is not part of the response.`;
    }

    console.log("Generating diet with prompt:", { isPersonalized, hasWeeklyLogs: !!weeklyFoodLogs });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.9,
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
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
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

    // Parse the JSON response
    let diet;
    try {
      // Clean up the response - remove markdown code blocks if present
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

    if (recipeRequest?.name) {
      if (!diet?.recipe || !Array.isArray(diet.recipe.ingredients) || !Array.isArray(diet.recipe.steps)) {
        throw new Error("AI did not return a valid recipe");
      }

      return new Response(JSON.stringify({ recipe: diet.recipe }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (regenerateMeal?.name) {
      if (!diet?.meal || !Array.isArray(diet.meal.options) || diet.meal.options.length !== 3) {
        throw new Error("AI did not return three meal options");
      }

      const refreshedMeal = {
        ...diet.meal,
        name: regenerateMeal.name,
        time: regenerateMeal.time || diet.meal.time,
        targetCalories: regenerateMeal.targetCalories || diet.meal.targetCalories,
      };

      return new Response(JSON.stringify({ meal: refreshedMeal }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ diet }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-diet function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate diet";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
