import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SlotIn {
  id?: string;
  course_code: string;
  course_name?: string;
  faculty_name?: string;
  room_no: string;
  day: string;
  start_time: string;
  end_time: string;
}

interface ReqBody {
  mode: "detect" | "suggest";
  slots: SlotIn[];
  context?: { faculty?: string[]; rooms?: { room_no: string; capacity: number }[]; courses?: string[] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as ReqBody;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = body.mode === "detect"
      ? "You are an expert academic scheduler. Detect conflicts in the given timetable: same room or same faculty double-booked at overlapping times, or back-to-back rooms in different buildings. Return concise findings with severity."
      : "You are an expert academic scheduler. Suggest an optimized weekly timetable that avoids conflicts (no faculty/room double-bookings), distributes faculty workload evenly, and respects room capacity. Provide a clear ordered list of suggested slots and a short rationale.";

    const userPrompt = body.mode === "detect"
      ? `Analyze this timetable and report conflicts:\n${JSON.stringify(body.slots, null, 2)}`
      : `Given existing slots:\n${JSON.stringify(body.slots, null, 2)}\n\nAvailable resources:\n${JSON.stringify(body.context ?? {}, null, 2)}\n\nSuggest an optimized timetable.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ result: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-timetable error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
