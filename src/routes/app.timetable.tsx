import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/app/timetable")({
  component: TimetablePage,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
type Day = typeof DAYS[number];
const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

interface Slot {
  id: string;
  course_id: string;
  faculty_id: string | null;
  classroom_id: string;
  day: Day;
  start_time: string;
  end_time: string;
  semester: number;
  department: string | null;
  courses?: { code: string; name: string } | null;
  faculty?: { full_name: string } | null;
  classrooms?: { room_no: string } | null;
}

interface Lookup { id: string; label: string; }

function TimetablePage() {
  const { primaryRole } = useAuth();
  const isAdmin = primaryRole === "admin";

  const [slots, setSlots] = useState<Slot[]>([]);
  const [courses, setCourses] = useState<Lookup[]>([]);
  const [faculty, setFaculty] = useState<Lookup[]>([]);
  const [rooms, setRooms] = useState<Lookup[]>([]);
  const [filterRole, setFilterRole] = useState<"all" | "faculty" | "student">("all");
  const [filterFaculty, setFilterFaculty] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    course_id: "",
    faculty_id: "",
    classroom_id: "",
    day: "Mon" as Day,
    start_time: "09:00",
    end_time: "10:00",
    semester: 5,
    department: "",
  });

  const load = async () => {
    setLoading(true);
    const [s, c, f, r] = await Promise.all([
      supabase.from("timetable_slots").select("*, courses(code,name), faculty(full_name), classrooms(room_no)"),
      supabase.from("courses").select("id, code, name"),
      supabase.from("faculty").select("id, full_name"),
      supabase.from("classrooms").select("id, room_no"),
    ]);
    setSlots((s.data ?? []) as any);
    setCourses((c.data ?? []).map((x: any) => ({ id: x.id, label: `${x.code} — ${x.name}` })));
    setFaculty((f.data ?? []).map((x: any) => ({ id: x.id, label: x.full_name })));
    setRooms((r.data ?? []).map((x: any) => ({ id: x.id, label: x.room_no })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Conflict detection (client-side overlap check)
  const conflicts = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i], b = slots[j];
        if (a.day !== b.day) continue;
        const overlap = a.start_time < b.end_time && b.start_time < a.end_time;
        if (!overlap) continue;
        if (a.classroom_id === b.classroom_id || (a.faculty_id && a.faculty_id === b.faculty_id)) {
          set.add(a.id); set.add(b.id);
        }
      }
    }
    return set;
  }, [slots]);

  const filtered = useMemo(() => {
    return slots.filter((s) => {
      if (filterFaculty !== "all" && s.faculty_id !== filterFaculty) return false;
      if (filterDept !== "all" && s.department !== filterDept) return false;
      return true;
    });
  }, [slots, filterFaculty, filterDept]);

  const departments = useMemo(
    () => Array.from(new Set(slots.map((s) => s.department).filter(Boolean) as string[])),
    [slots]
  );

  const slotAt = (day: Day, time: string) =>
    filtered.filter((s) => s.day === day && s.start_time <= time && s.end_time > time);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.start_time >= form.end_time) {
      toast.error("End time must be after start time");
      return;
    }
    setBusy(true);
    const payload = {
      ...form,
      faculty_id: form.faculty_id || null,
      semester: Number(form.semester),
      department: form.department || null,
    };
    const { error } = await supabase.from("timetable_slots").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Slot added");
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this slot?")) return;
    const { error } = await supabase.from("timetable_slots").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Timetable</h1>
          <p className="text-sm text-muted-foreground">
            Weekly schedule {conflicts.size > 0 && (
              <span className="inline-flex items-center gap-1 text-destructive font-medium ml-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {conflicts.size / 2 | 0}+ conflicts detected
              </span>
            )}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add slot</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add timetable slot</DialogTitle>
                <DialogDescription>Assign course, faculty and room to a time slot.</DialogDescription>
              </DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div>
                  <Label>Course</Label>
                  <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Faculty</Label>
                    <Select value={form.faculty_id} onValueChange={(v) => setForm({ ...form, faculty_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Faculty" /></SelectTrigger>
                      <SelectContent>{faculty.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Room</Label>
                    <Select value={form.classroom_id} onValueChange={(v) => setForm({ ...form, classroom_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Room" /></SelectTrigger>
                      <SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Day</Label>
                    <Select value={form.day} onValueChange={(v) => setForm({ ...form, day: v as Day })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Start</Label><Input type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                  <div><Label>End</Label><Input type="time" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Semester</Label><Input type="number" min={1} value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })} /></div>
                  <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                </div>
                <DialogFooter><Button type="submit" disabled={busy || !form.course_id || !form.classroom_id}>{busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Add</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-3 flex flex-wrap gap-3 items-end">
        <div className="min-w-[140px]">
          <Label className="text-xs">View as</Label>
          <Select value={filterRole} onValueChange={(v) => setFilterRole(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Admin (all)</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filterRole === "faculty" && (
          <div className="min-w-[180px]">
            <Label className="text-xs">Faculty</Label>
            <Select value={filterFaculty} onValueChange={setFilterFaculty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All faculty</SelectItem>
                {faculty.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {filterRole === "student" && (
          <div className="min-w-[180px]">
            <Label className="text-xs">Department</Label>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : (
          <div className="min-w-[800px] grid" style={{ gridTemplateColumns: `80px repeat(${DAYS.length}, minmax(120px,1fr))` }}>
            <div className="bg-muted/40 p-2 text-xs font-semibold border-b border-r">Time</div>
            {DAYS.map((d) => (
              <div key={d} className="bg-muted/40 p-2 text-xs font-semibold text-center border-b border-r last:border-r-0">{d}</div>
            ))}
            {HOURS.map((h, hi) => (
              <Fragment key={h}>
                <div className="p-2 text-xs text-muted-foreground border-b border-r font-mono">{h}</div>
                {DAYS.map((d) => {
                  const cellSlots = slotAt(d, h);
                  return (
                    <div key={`${d}-${h}`} className={`min-h-[60px] p-1.5 border-b border-r last:border-r-0 ${hi % 2 ? "bg-muted/10" : ""}`}>
                      {cellSlots.map((s) => {
                        const isConflict = conflicts.has(s.id);
                        return (
                          <div
                            key={s.id}
                            className={`group relative rounded-md p-1.5 mb-1 text-[11px] leading-tight ${
                              isConflict
                                ? "bg-destructive/15 border border-destructive/40 text-destructive-foreground"
                                : "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-sm"
                            }`}
                          >
                            <div className="font-semibold truncate">{s.courses?.code}</div>
                            <div className="opacity-90 truncate">{s.classrooms?.room_no} · {s.faculty?.full_name?.split(" ").slice(-1)[0] ?? "—"}</div>
                            {isAdmin && (
                              <button
                                onClick={() => del(s.id)}
                                className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition"
                                aria-label="Delete slot"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
