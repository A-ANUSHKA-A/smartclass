import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/app/students")({
  component: StudentsPage,
});

interface Student {
  id: string;
  roll_no: string;
  full_name: string;
  email: string | null;
  department: string | null;
  semester: number | null;
  cgpa: number | null;
}

const empty: Omit<Student, "id"> = {
  roll_no: "",
  full_name: "",
  email: "",
  department: "",
  semester: 1,
  cgpa: 0,
};

function StudentsPage() {
  const { primaryRole } = useAuth();
  const isAdmin = primaryRole === "admin";
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<Omit<Student, "id">>(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Student[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      roll_no: s.roll_no,
      full_name: s.full_name,
      email: s.email ?? "",
      department: s.department ?? "",
      semester: s.semester ?? 1,
      cgpa: s.cgpa ?? 0,
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, semester: Number(form.semester), cgpa: Number(form.cgpa) };
    const { error } = editing
      ? await supabase.from("students").update(payload).eq("id", editing.id)
      : await supabase.from("students").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Student updated" : "Student added");
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this student?")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">Manage student records, CGPA & department.</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit student" : "Add student"}</DialogTitle>
                <DialogDescription>Provide student details below.</DialogDescription>
              </DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Roll No</Label>
                    <Input required value={form.roll_no} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Full name</Label>
                  <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Semester</Label>
                    <Input type="number" min={1} max={12} value={form.semester ?? 1} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>CGPA</Label>
                    <Input type="number" step="0.01" min={0} max={10} value={form.cgpa ?? 0} onChange={(e) => setForm({ ...form, cgpa: Number(e.target.value) })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Department</TableHead>
              <TableHead className="hidden md:table-cell">Sem</TableHead>
              <TableHead>CGPA</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No students yet.</TableCell></TableRow>
            ) : rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.roll_no}</TableCell>
                <TableCell className="font-medium">{s.full_name}</TableCell>
                <TableCell className="hidden sm:table-cell">{s.department}</TableCell>
                <TableCell className="hidden md:table-cell">{s.semester}</TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    (s.cgpa ?? 0) >= 8.5 ? "bg-success/15 text-success" :
                    (s.cgpa ?? 0) >= 7 ? "bg-primary/15 text-primary" :
                    "bg-warning/15 text-warning-foreground"
                  }`}>{(s.cgpa ?? 0).toFixed(2)}</span>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => del(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
