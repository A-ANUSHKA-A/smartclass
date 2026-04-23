import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  Users,
  Sparkles,
  GraduationCap,
  DoorOpen,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartClass — AI-Powered Classroom Resource Allocation" },
      {
        name: "description",
        content:
          "Smart Classroom Resource Allocation System. Generate conflict-free timetables, manage students, faculty, and rooms with Gemini AI assistance.",
      },
      { property: "og:title", content: "SmartClass — AI Classroom Resource Allocation" },
      {
        property: "og:description",
        content: "Conflict-free timetables, dashboards, and AI optimization for institutions.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  const features = [
    { icon: Calendar, title: "Conflict-free Timetables", desc: "Auto-generate schedules with AI validation." },
    { icon: Users, title: "Student Management", desc: "CRUD, CGPA tracking, attendance insights." },
    { icon: GraduationCap, title: "Faculty Workload", desc: "Track availability and weekly hours." },
    { icon: DoorOpen, title: "Room Allocation", desc: "Capacity-aware classroom assignment." },
    { icon: Sparkles, title: "Gemini AI", desc: "Detect conflicts and suggest optimized timetables." },
    { icon: BarChart3, title: "Dashboards", desc: "Live stats, charts, and room utilization." },
  ];

  return (
    <div className="min-h-screen bg-[image:var(--gradient-subtle)]">
      {/* Header */}
      <header className="border-b bg-background/70 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground font-bold">
              S
            </div>
            <span className="font-semibold">SmartClass</span>
          </div>
          <div className="flex gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 lg:py-28 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Powered by Gemini AI
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
          Smart Classroom{" "}
          <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
            Resource Allocation
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base lg:text-lg text-muted-foreground">
          Generate conflict-free timetables, manage students and faculty, and let AI optimize
          room and schedule allocation for your institution.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="shadow-[var(--shadow-elegant)]">
              Launch dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/app/timetable">
            <Button size="lg" variant="outline">View timetable</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="p-5 hover:shadow-[var(--shadow-elegant)] transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-accent text-accent-foreground grid place-items-center mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SmartClass. Built with Lovable.
      </footer>
    </div>
  );
}
