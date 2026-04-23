import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/courses")({
  component: CoursesPage,
});

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  credits: number;
  faculty_id: string | null;
}
interface Faculty { id: string; full_name: string; }

const empty: Omit<Course, "id"> = { code: "", name: "", department: "", credits: 3, faculty_id: null };

function CoursesPage() {
  const [rows, setRows] = useState<(Course & { faculty?: { full_name: string } | null })[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<Omit<Course, "id">>(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, f] = await Promise.all([
      supabase.from("courses").select("*, faculty(full_name)").order("code"),
      supabase.from("faculty").select("id, full_name"),
    ]);
    setRows((c.data ?? []) as any);
    setFaculty((f.data ?? []) as Faculty[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({ code: c.code, name: c.name, department: c.department ?? "", credits: c.credits, faculty_id: c.faculty_id });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, credits: Number(form.credits) };
    const { error } = editing
      ? await supabase.from("courses").update(payload).eq("id", editing.id)
      : await supabase.from("courses").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-sm text-muted-foreground">Subjects and assigned faculty.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add course</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit course" : "Add course"}</DialogTitle>
              <DialogDescription>Course code, name and assigned faculty.</DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code</Label><Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div><Label>Credits</Label><Input type="number" min={1} max={10} value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Department</Label><Input value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              <div>
                <Label>Faculty</Label>
                <Select value={form.faculty_id ?? "none"} onValueChange={(v) => setForm({ ...form, faculty_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Assign faculty" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {faculty.map((f) => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Department</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead className="hidden md:table-cell">Faculty</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
            ) : rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.code}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="hidden sm:table-cell">{c.department}</TableCell>
                <TableCell>{c.credits}</TableCell>
                <TableCell className="hidden md:table-cell">{c.faculty?.full_name ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
