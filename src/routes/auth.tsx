import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, BrainCircuit, Building2, CheckCircle2, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  head: () => ({ meta: [{ title: "Anmelden – MeisterMe" }] }),
  component: AuthPage,
});

type Mode = "login" | "register";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim(), betrieb: company.trim() },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage("Konto angelegt. Bitte bestätige jetzt den Link in deiner E-Mail.");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }

      await navigate({ to: "/app" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setMessage(null);
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#063a70] px-12 py-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_10%,#62b0ff_0,transparent_35%),radial-gradient(circle_at_90%_90%,#26c281_0,transparent_32%)]" />
        <div className="relative z-10">
          <Logo variant="light" />
        </div>
        <div className="relative z-10 my-auto max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">
            Der digitale Betrieb
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.08] tracking-tight">
            Weniger Büro.<br />Mehr Baustelle.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-blue-100/85">
            Projekte, Personal, Zeiten, Dokumente und KI-Werkzeuge in einer sicheren Plattform für
            Stuckateure, Maler und Ausbaugewerke.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {[
              [Building2, "Baustellen & Aufmaß"],
              [BrainCircuit, "KI-Berichte & Angebote"],
              [ShieldCheck, "Sichere Mandantendaten"],
              [CheckCircle2, "Mobil und am Desktop"],
            ].map(([Icon, label]) => (
              <div key={label as string} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                <Icon className="h-5 w-5 text-blue-200" />
                <span className="text-sm font-medium">{label as string}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs text-blue-200/70">Eigenständig betrieben · Deine Daten, dein Projekt</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-9 lg:hidden">
            <Logo />
          </div>
          <p className="text-sm font-semibold text-brand">{mode === "login" ? "Willkommen zurück" : "Betrieb einrichten"}</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-slate-900">
            {mode === "login" ? "Bei MeisterMe anmelden" : "Kostenloses Konto anlegen"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "login"
              ? "Arbeite dort weiter, wo du aufgehört hast."
              : "Du wirst als Inhaber deines neuen Betriebs eingerichtet."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
            {mode === "register" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="full-name">Dein Name</Label>
                  <Input id="full-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company">Betriebsname</Label>
                  <Input id="company" autoComplete="organization" value={company} onChange={(event) => setCompany(event.target.value)} required />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Passwort</Label>
              <Input id="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>

            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

            <Button type="submit" disabled={loading} className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90">
              {loading ? "Bitte warten …" : mode === "login" ? "Anmelden" : "Konto erstellen"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === "login" ? "Noch kein Konto?" : "Schon registriert?"}{" "}
            <button type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")} className="font-semibold text-brand hover:underline">
              {mode === "login" ? "Betrieb anlegen" : "Jetzt anmelden"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
