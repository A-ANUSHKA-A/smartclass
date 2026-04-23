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

export const Route = createFileRoute("/app/classrooms")({
  component: ClassroomsPage,
});

interface Classroom {
  id: string;
  room_no: string;
  building: string | null;
  capacity: number;
  room_type: string | null;
}

const empty: Omit<Classroom, "id"> = { room_no: "", building: "", capacity: 30, room_type: "lecture" };

function ClassroomsPage() {
  const [rows, setRows] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [form, setForm] = useState<Omit<Classroom, "id">>(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("classrooms").select("*").order("room_no");
    if (error) toast.error(error.message);
    setRows((data ?? []) as Classroom[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Classroom) => {
    setEditing(c);
    setForm({ room_no: c.room_no, building: c.building ?? "", capacity: c.capacity, room_type: c.room_type ?? "lecture" });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, capacity: Number(form.capacity) };
    const { error } = editing
      ? await supabase.from("classrooms").update(payload).eq("id", editing.id)
      : await supabase.from("classrooms").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this classroom?")) return;
    const { error } = await supabase.from("classrooms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Classrooms</h1>
          <p className="text-sm text-muted-foreground">Rooms, capacity & allocation.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add room</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit classroom" : "Add classroom"}</DialogTitle>
              <DialogDescription>Room details and capacity.</DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Room No</Label><Input required value={form.room_no} onChange={(e) => setForm({ ...form, room_no: e.target.value })} /></div>
                <div><Label>Building</Label><Input value={form.building ?? ""} onChange={(e) => setForm({ ...form, building: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Capacity</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.room_type ?? "lecture"} onValueChange={(v) => setForm({ ...form, room_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lecture">Lecture</SelectItem>
                      <SelectItem value="lab">Lab</SelectItem>
                      <SelectItem value="auditorium">Auditorium</SelectItem>
                      <SelectItem value="seminar">Seminar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <TableHead>Room</TableHead>
              <TableHead>Building</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
            ) : rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.room_no}</TableCell>
                <TableCell>{c.building}</TableCell>
                <TableCell><span className="inline-flex rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-xs">{c.room_type}</span></TableCell>
                <TableCell>{c.capacity}</TableCell>
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
