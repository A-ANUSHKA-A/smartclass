import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: AppRole[];
}) {
  const { user, loading, primaryRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (roles && primaryRole && !roles.includes(primaryRole)) {
    return (
      <div className="min-h-screen grid place-items-center p-4">
        <div className="max-w-md text-center space-y-2">
          <h2 className="text-xl font-semibold">Access denied</h2>
          <p className="text-sm text-muted-foreground">
            Your role ({primaryRole}) does not have access to this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
