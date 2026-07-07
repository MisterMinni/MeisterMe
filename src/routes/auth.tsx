import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HardHat, ArrowLeft } from "lucide-react";

const search = z.object({ mode: z.enum(["login", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Anmelden – MeisterMe" }] }),
  validateSearch: (s) => search.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = useSearch({ from: "/auth" });
  const [tab, setTab] = useState<"login" | "signup">(mode ?? "login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", betrieb: "", name: "" });
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin + "/app",
            data: { betrieb: form.betrieb || "Mein Betrieb", full_name: form.name || form.email },
          },
        });
        if (error) throw error;
        toast.success("Konto erstellt – willkommen bei MeisterMe!");
        navigate({ to: "/app" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success("Willkommen zurück!");
        navigate({ to: "/app" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: Brand */}
      <div className="relative hidden bg-navy p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo variant="light" />
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">
            Weniger Büro.<br />
            <span className="text-brand">Mehr Baustelle.</span>
          </h2>
          <p className="mt-4 max-w-md text-white/70">
            Aufmaß, Angebot, Bericht und Rechnung in einer App – KI-gestützt und mobil-first.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/60">
          <HardHat className="h-5 w-5 text-brand" />
          <span>Für deutsche Handwerksbetriebe. Server in der EU.</span>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex flex-col justify-center bg-background p-6 sm:p-12">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:hidden">
            <ArrowLeft className="h-4 w-4" /> zurück
          </Link>
          <div className="lg:hidden mb-8"><Logo /></div>

          <h1 className="font-display text-3xl font-bold">
            {tab === "signup" ? "Konto anlegen" : "Willkommen zurück"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {tab === "signup"
              ? "In 30 Sekunden startklar – keine Kreditkarte nötig."
              : "Melde dich mit deiner E-Mail-Adresse an."}
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-lg bg-secondary p-1 text-sm font-medium">
            <button
              onClick={() => setTab("login")}
              className={`rounded-md py-2 transition ${tab === "login" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              Anmelden
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`rounded-md py-2 transition ${tab === "signup" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              Neu registrieren
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {tab === "signup" && (
              <>
                <div>
                  <Label htmlFor="betrieb">Betriebsname</Label>
                  <Input
                    id="betrieb"
                    placeholder="z.B. Stuck & Putz Meister GmbH"
                    value={form.betrieb}
                    onChange={(e) => setForm({ ...form, betrieb: e.target.value })}
                    className="mt-1 h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Dein Name</Label>
                  <Input
                    id="name"
                    placeholder="Vor- und Nachname"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 h-12"
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 h-12"
              />
            </div>
            <div>
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 h-12"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full bg-brand text-brand-foreground text-base font-semibold hover:bg-brand/90"
            >
              {loading ? "Bitte warten…" : tab === "signup" ? "Konto erstellen" : "Anmelden"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
