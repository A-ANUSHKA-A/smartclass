import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ai")({
  component: AIPage,
});

function AIPage() {
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"detect" | "suggest" | null>(null);
  const [result, setResult] = useState<string>("");

  const run = async (m: "detect" | "suggest") => {
    setBusy(true);
    setMode(m);
    setResult("");
    try {
      const [s, f, r, c] = await Promise.all([
        supabase.from("timetable_slots").select("id, day, start_time, end_time, courses(code,name), faculty(full_name), classrooms(room_no)"),
        supabase.from("faculty").select("full_name"),
        supabase.from("classrooms").select("room_no, capacity"),
        supabase.from("courses").select("code"),
      ]);
      const slots = (s.data ?? []).map((x: any) => ({
        id: x.id,
        course_code: x.courses?.code,
        course_name: x.courses?.name,
        faculty_name: x.faculty?.full_name,
        room_no: x.classrooms?.room_no,
        day: x.day,
        start_time: x.start_time,
        end_time: x.end_time,
      }));

      const { data, error } = await supabase.functions.invoke("ai-timetable", {
        body: {
          mode: m,
          slots,
          context: {
            faculty: (f.data ?? []).map((x) => x.full_name),
            rooms: r.data ?? [],
            courses: (c.data ?? []).map((x) => x.code),
          },
        },
      });
      if (error) throw error;
      setResult(data.result);
    } catch (e: any) {
      const msg = e?.message ?? "AI request failed";
      if (msg.includes("429")) toast.error("Rate limited. Try again in a moment.");
      else if (msg.includes("402")) toast.error("AI credits exhausted. Add credits to continue.");
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Powered by Gemini
        </div>
        <h1 className="text-2xl font-bold mt-1">AI Assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detect timetable conflicts or generate an optimized schedule.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <div className="h-10 w-10 rounded-lg bg-destructive/15 text-destructive grid place-items-center mb-3">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="font-semibold">Detect conflicts</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Find room and faculty double-bookings.</p>
          <Button onClick={() => run("detect")} disabled={busy} className="w-full">
            {busy && mode === "detect" && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Run analysis
          </Button>
        </Card>

        <Card className="p-5">
          <div className="h-10 w-10 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground grid place-items-center mb-3">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="font-semibold">Suggest optimized timetable</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Balanced workload, no clashes, capacity-aware.</p>
          <Button onClick={() => run("suggest")} disabled={busy} className="w-full">
            {busy && mode === "suggest" && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Generate
          </Button>
        </Card>
      </div>

      {result && (
        <Card className="p-5">
          <h3 className="font-semibold mb-2">
            {mode === "detect" ? "Conflict report" : "Suggested timetable"}
          </h3>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-sans">
            {result}
          </pre>
        </Card>
      )}
    </div>
  );
}
