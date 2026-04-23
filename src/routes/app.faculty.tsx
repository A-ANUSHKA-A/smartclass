import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/faculty")({
  component: FacultyPage,
});

interface Faculty {
  id: string;
  employee_id: string;
  full_name: string;
  email: string | null;
  department: string | null;
  designation: string | null;
  max_hours_per_week: number | null;
}

interface WorkloadInfo {
  faculty_id: string;
  hours: number;
}

const empty: Omit<Faculty, "id"> = {
  employee_id: "",
  full_name: "",
  email: "",
  department: "",
  designation: "",
  max_hours_per_week: 18,
};

function FacultyPage() {
  const [rows, setRows] = useState<Faculty[]>([]);
  const [workload, setWorkload] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [form, setForm] = useState<Omit<Faculty, "id">>(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, slots] = await Promise.all([
      supabase.from("faculty").select("*").order("created_at", { ascending: false }),
      supabase.from("timetable_slots").select("faculty_id, start_time, end_time"),
    ]);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Faculty[]);

    const wl: Record<string, number> = {};
    (slots.data ?? []).forEach((s) => {
      if (!s.faculty_id) return;
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);
      const hours = (eh + em / 60) - (sh + sm / 60);
      wl[s.faculty_id] = (wl[s.faculty_id] ?? 0) + hours;
    });
    setWorkload(wl);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (f: Faculty) => {
    setEditing(f);
    setForm({
      employee_id: f.employee_id,
      full_name: f.full_name,
      email: f.email ?? "",
      department: f.department ?? "",
      designation: f.designation ?? "",
      max_hours_per_week: f.max_hours_per_week ?? 18,
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, max_hours_per_week: Number(form.max_hours_per_week) };
    const { error } = editing
      ? await supabase.from("faculty").update(payload).eq("id", editing.id)
      : await supabase.from("faculty").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this faculty?")) return;
    const { error } = await supabase.from("faculty").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Faculty</h1>
          <p className="text-sm text-muted-foreground">Manage faculty, availability and workload.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add faculty</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit faculty" : "Add faculty"}</DialogTitle>
              <DialogDescription>Faculty details and weekly workload limit.</DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Employee ID</Label><Input required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} /></div>
                <div><Label>Department</Label><Input value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              </div>
              <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Designation</Label><Input value={form.designation ?? ""} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
                <div><Label>Max hours / week</Label><Input type="number" value={form.max_hours_per_week ?? 18} onChange={(e) => setForm({ ...form, max_hours_per_week: Number(e.target.value) })} /></div>
              </div>
              <DialogFooter><Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Emp ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Dept</TableHead>
              <TableHead className="hidden md:table-cell">Designation</TableHead>
              <TableHead>Workload</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
            ) : rows.map((f) => {
              const used = workload[f.id] ?? 0;
              const max = f.max_hours_per_week ?? 18;
              const pct = Math.min(100, Math.round((used / max) * 100));
              return (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.employee_id}</TableCell>
                  <TableCell className="font-medium">{f.full_name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{f.department}</TableCell>
                  <TableCell className="hidden md:table-cell">{f.designation}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-success"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{used}/{max}h</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => del(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
