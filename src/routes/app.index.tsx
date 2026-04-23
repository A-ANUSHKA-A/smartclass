import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, DoorOpen, TrendingUp, CalendarCheck } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

interface Stats {
  students: number;
  faculty: number;
  courses: number;
  classrooms: number;
  slots: number;
  attendanceRate: number;
}

function Dashboard() {
  const { primaryRole } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [roomUsage, setRoomUsage] = useState<{ room: string; slots: number }[]>([]);
  const [deptDist, setDeptDist] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [s, f, c, r, t, att] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("faculty").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("classrooms").select("id", { count: "exact", head: true }),
        supabase.from("timetable_slots").select("id, classroom_id, classrooms(room_no)"),
        supabase.from("attendance").select("status"),
      ]);

      const slotsRows = (t.data ?? []) as Array<{ classrooms: { room_no: string } | null }>;
      const usage: Record<string, number> = {};
      slotsRows.forEach((row) => {
        const name = row.classrooms?.room_no ?? "—";
        usage[name] = (usage[name] ?? 0) + 1;
      });
      setRoomUsage(Object.entries(usage).map(([room, slots]) => ({ room, slots })));

      const studentsByDept = await supabase.from("students").select("department");
      const dist: Record<string, number> = {};
      (studentsByDept.data ?? []).forEach((r) => {
        const d = r.department ?? "Other";
        dist[d] = (dist[d] ?? 0) + 1;
      });
      setDeptDist(Object.entries(dist).map(([name, value]) => ({ name, value })));

      const attRows = att.data ?? [];
      const present = attRows.filter((a) => a.status === "present").length;
      const rate = attRows.length ? Math.round((present / attRows.length) * 100) : 0;

      setStats({
        students: s.count ?? 0,
        faculty: f.count ?? 0,
        courses: c.count ?? 0,
        classrooms: r.count ?? 0,
        slots: t.data?.length ?? 0,
        attendanceRate: rate,
      });
    })();
  }, []);

  const cards = [
    { label: "Students", value: stats?.students ?? "—", icon: Users, color: "text-chart-1" },
    { label: "Faculty", value: stats?.faculty ?? "—", icon: GraduationCap, color: "text-chart-2" },
    { label: "Courses", value: stats?.courses ?? "—", icon: BookOpen, color: "text-chart-3" },
    { label: "Classrooms", value: stats?.classrooms ?? "—", icon: DoorOpen, color: "text-chart-4" },
    { label: "Scheduled Slots", value: stats?.slots ?? "—", icon: CalendarCheck, color: "text-chart-5" },
    { label: "Attendance", value: stats ? `${stats.attendanceRate}%` : "—", icon: TrendingUp, color: "text-success" },
  ];

  const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {primaryRole} dashboard
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold mt-1">Welcome back 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of resources, schedules and utilization.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <Icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <div className="mt-2 text-2xl font-bold">{c.value}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h3 className="font-semibold mb-3">Room Utilization (slots / week)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="room" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="slots" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Students by Department</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptDist}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label
                >
                  {deptDist.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
