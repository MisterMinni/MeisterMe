import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { completeTeamInvitation } from "@/lib/team.functions";

export const Route = createFileRoute("/accept-invite")({
  ssr: false,
  head: () => ({ meta: [{ title: "Einladung annehmen – MeisterMe" }] }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const navigate = useNavigate();
  const completeInvitation = useServerFn(completeTeamInvitation);
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setChecking(false);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setChecking(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (password !== confirmation) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setSaving(true);
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;
      await completeInvitation();
      await navigate({ to: "/app" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Einladung konnte nicht abgeschlossen werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          {checking ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-brand" />
              <p>Einladung wird geprüft …</p>
            </div>
          ) : !session ? (
            <div className="space-y-5 text-center">
              <KeyRound className="mx-auto h-10 w-10 text-slate-400" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Einladungslink ungültig</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Der Link ist abgelaufen oder wurde bereits verwendet. Bitte den Betriebsadmin um eine neue Einladung.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth">Zur Anmeldung</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <h1 className="mt-3 text-2xl font-bold text-slate-900">Willkommen bei MeisterMe</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Lege jetzt dein persönliches Passwort fest. Dein Betriebsadmin kann es nicht einsehen.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-email">E-Mail</Label>
                <Input id="invite-email" value={session.user.email ?? ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-password">Neues Passwort</Label>
                <Input
                  id="invite-password"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-password-confirmation">Passwort wiederholen</Label>
                <Input
                  id="invite-password-confirmation"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={saving} className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {saving ? "Zugang wird eingerichtet …" : "Passwort speichern und starten"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
