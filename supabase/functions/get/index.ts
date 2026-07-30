import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isValid = (v: unknown) => typeof v === "string" && v.trim().length > 0 && v.length <= 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const errors: Record<string, string> = {};
    for (const field of ["user_id", "property_1", "property_2"]) {
      if (!isValid(body?.[field])) {
        errors[field] = `${field} must be a non-empty string (max 1000 chars)`;
      }
    }
    if (Object.keys(errors).length > 0) return json({ error: errors }, 400);

    const user_id = (body.user_id as string).trim();
    const property_1 = (body.property_1 as string).trim();
    const property_2 = (body.property_2 as string).trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("kv_records")
      .select("property_1, property_2, value")
      .eq("user_id", user_id)
      .eq("property_1", property_1)
      .eq("property_2", property_2)
      .maybeSingle();

    if (error) {
      console.error("get error:", error);
      return json({ error: "Failed to fetch record" }, 500);
    }

    if (!data) return json({ error: "Not Found" }, 404);

    return json(data, 200);
  } catch (e) {
    console.error("get unexpected error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
