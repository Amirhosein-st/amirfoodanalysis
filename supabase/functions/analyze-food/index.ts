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
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a nutrition expert AI that analyzes food images. When given an image of food, identify the food items and estimate their nutritional content. Always respond with a JSON object containing:
- food_name: A descriptive name of the food (e.g., "Grilled Chicken Salad with Ranch Dressing")
- calories: Estimated calories (number)
- protein: Estimated protein in grams (number)
- carbs: Estimated carbohydrates in grams (number)
- fat: Estimated fat in grams (number)
- confidence: Your confidence level ("high", "medium", or "low")
- notes: Any relevant notes about the estimation

Be as accurate as possible based on typical portion sizes. If you cannot identify the food, set food_name to "Unknown Food" and provide your best estimates.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this food image and provide the nutritional information in JSON format."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_food",
              description: "Analyze food image and return nutritional information",
              parameters: {
                type: "object",
                properties: {
                  food_name: { type: "string", description: "Name of the food item(s)" },
                  calories: { type: "number", description: "Estimated calories" },
                  protein: { type: "number", description: "Estimated protein in grams" },
                  carbs: { type: "number", description: "Estimated carbohydrates in grams" },
                  fat: { type: "number", description: "Estimated fat in grams" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  notes: { type: "string", description: "Additional notes about the food" }
                },
                required: ["food_name", "calories", "protein", "carbs", "fat", "confidence"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_food" } }
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
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to analyze image");
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const nutritionData = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify(nutritionData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: try to parse from content
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return new Response(
            JSON.stringify(parsed),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        // If parsing fails, return a basic response
      }
    }

    return new Response(
      JSON.stringify({ 
        error: "Could not analyze the food image. Please try again or enter manually." 
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("analyze-food error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
