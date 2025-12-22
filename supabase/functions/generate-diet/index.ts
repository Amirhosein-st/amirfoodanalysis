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
    const { healthProfile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a professional nutritionist. Based on the user's health profile, create a personalized daily diet plan. 
    
    IMPORTANT: You must respond with ONLY a valid JSON object, no markdown, no code blocks, just pure JSON.
    
    The JSON must have this exact structure:
    {
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
      "tips": ["tip1", "tip2", "tip3"]
    }
    
    Consider:
    - User's goal (weight loss, muscle gain, maintenance)
    - Activity level
    - Diet preferences
    - Food allergies and medical conditions
    - Liked and disliked foods
    - Number of meals per day they prefer`;

    const userPrompt = `Create a personalized diet plan for this user:
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
    - Disliked Foods: ${healthProfile.disliked_foods?.join(", ") || "No preferences"}`;

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
