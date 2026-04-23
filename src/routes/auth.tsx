import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SmartClass" },
      { name: "description", content: "Sign in or create your SmartClass account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPwd, setSigninPwd] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPwd, setSignupPwd] = useState("");
  const [signupRole, setSignupRole] = useState<AppRole>("student");
  const [busy, setBusy] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: signinEmail,
      password: signinPwd,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Welcome back!");
      navigate({ to: "/app" });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPwd.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: signupName, role: signupRole },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Account created! You can now sign in.");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[image:var(--gradient-subtle)] p-4">
      <Card className="w-full max-w-md p-6 shadow-[var(--shadow-elegant)]">
        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 rounded-xl bg-[image:var(--gradient-primary)] grid place-items-center text-primary-foreground font-bold mb-3">
            S
          </div>
          <h1 className="text-2xl font-semibold">SmartClass</h1>
          <p className="text-sm text-muted-foreground">Resource allocation, simplified.</p>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-3 mt-4">
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <Label htmlFor="si-email">Email</Label>
                <Input id="si-email" type="email" required value={signinEmail} onChange={(e) => setSigninEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="si-pwd">Password</Label>
                <Input id="si-pwd" type="password" required value={signinPwd} onChange={(e) => setSigninPwd(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-3 mt-4">
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <Label htmlFor="su-name">Full name</Label>
                <Input id="su-name" required value={signupName} onChange={(e) => setSignupName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" type="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="su-pwd">Password</Label>
                <Input id="su-pwd" type="password" required minLength={6} value={signupPwd} onChange={(e) => setSignupPwd(e.target.value)} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={signupRole} onValueChange={(v) => setSignupRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
