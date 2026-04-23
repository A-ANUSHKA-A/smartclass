import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  DoorOpen,
  BookOpen,
  Calendar,
  Sparkles,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: AppRole[];
}

const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "faculty", "student"] },
  { to: "/app/students", label: "Students", icon: Users, roles: ["admin", "faculty"] },
  { to: "/app/faculty", label: "Faculty", icon: GraduationCap, roles: ["admin"] },
  { to: "/app/classrooms", label: "Classrooms", icon: DoorOpen, roles: ["admin"] },
  { to: "/app/courses", label: "Courses", icon: BookOpen, roles: ["admin", "faculty"] },
  { to: "/app/timetable", label: "Timetable", icon: Calendar, roles: ["admin", "faculty", "student"] },
  { to: "/app/ai", label: "AI Assistant", icon: Sparkles, roles: ["admin", "faculty"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { primaryRole, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((i) => primaryRole && i.roles.includes(primaryRole));

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b bg-card px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground font-bold">S</div>
          <span className="font-semibold">SmartClass</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:sticky top-0 z-30 h-screen w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
            <div className="h-8 w-8 rounded-md bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground font-bold">
              S
            </div>
            <div>
              <div className="font-semibold text-sm leading-tight">SmartClass</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Resource Allocator
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to || (item.to !== "/app" && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[var(--shadow-elegant)]"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-3">
            <div className="mb-2 px-2">
              <div className="text-xs font-medium truncate">{user?.email}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {primaryRole}
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Sign out
            </Button>
          </div>
        </aside>

        {open && (
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          />
        )}

        <main className="flex-1 min-w-0 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
