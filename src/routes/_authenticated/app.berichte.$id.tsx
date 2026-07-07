import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Sparkles, Mail, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/handwerk";
import { generateReport, generateCustomerEmail } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/berichte/$id")({
  head: () => ({ meta: [{ title: "Bericht – MeisterMe" }] }),
  component: BerichtDetail,
});

function BerichtDetail() {
  const { id } = useParams({ from: "/_authenticated/app/berichte/$id" });
  const qc = useQueryClient();
  const nav = useNavigate();
  const genReport = useServerFn(generateReport);
  const genMail = useServerFn(generateCustomerEmail);
  const [ki, setKi] = useState<{ betreff?: string; body?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: r } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => (await supabase.from("field_reports").select("*, projects(id, name, customers(firma, ansprechpartner))").eq("id", id).maybeSingle()).data,
  });

  async function makeReport() {
    if (!r) return;
    setBusy(true);
    try {
      const p = r.projects as any;
      const res = await genReport({ data: {
        taetigkeit: r.taetigkeit ?? r.sprachnotiz ?? "",
        material: JSON.stringify(r.material ?? []),
        offenePunkte: r.offene_punkte ?? "",
        arbeitszeit: `${r.start_zeit}-${r.end_zeit}, Pause ${r.pause_min} min, Fahrt ${r.fahrt_min} min`,
        projekt: p?.name ?? "",
        kunde: p?.customers?.firma ?? "",
      }});
      await supabase.from("field_reports").update({ ki_bericht: res.text, status: "fertig" as any }).eq("id", id);
      toast.success("Bericht erstellt");
      qc.invalidateQueries({ queryKey: ["report", id] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  async function makeMail() {
    if (!r) return;
    setBusy(true);
    try {
      const p = r.projects as any;
      const res = await genMail({ data: {
        kunde: p?.customers?.firma ?? "Kunde",
        projekt: p?.name ?? "",
        anlass: "Baustellenbericht",
        inhalt: r.ki_bericht ?? r.taetigkeit ?? r.sprachnotiz ?? "",
      }});
      setKi(res);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  async function del() {
    if (!confirm("Bericht löschen?")) return;
    await supabase.from("field_reports").delete().eq("id", id);
    nav({ to: "/app/berichte" });
  }

  if (!r) return <div className="text-muted-foreground">Lade…</div>;

  return (
    <div>
      <Link to="/app/berichte" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Zurück</Link>
      <PageHeader
        title={`Bericht ${formatDate(r.datum)}`}
        subtitle={(r.projects as any)?.name}
        action={
          <>
            <Badge variant="secondary">{r.status}</Badge>
            <Button variant="outline" onClick={del}><Trash2 className="h-4 w-4" /></Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 font-display font-semibold">Rohdaten</h3>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-muted-foreground">Tätigkeit</dt><dd className="whitespace-pre-wrap">{r.taetigkeit ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Zeit</dt><dd>{r.start_zeit}–{r.end_zeit} (Pause {r.pause_min} min, Fahrt {r.fahrt_min} min)</dd></div>
            <div><dt className="text-muted-foreground">Probleme</dt><dd>{r.probleme || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Offene Punkte</dt><dd>{r.offene_punkte || "—"}</dd></div>
            {r.sprachnotiz && <div><dt className="text-muted-foreground">Sprachnotiz</dt><dd className="whitespace-pre-wrap italic">{r.sprachnotiz}</dd></div>}
            {Array.isArray(r.material) && r.material.length > 0 && (
              <div><dt className="text-muted-foreground">Material</dt>
                <dd><ul className="mt-1 space-y-0.5">{(r.material as any[]).map((m, i) => <li key={i}>· {m.bezeichnung} {m.menge ?? ""} {m.einheit ?? ""}</li>)}</ul></dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display font-semibold">KI-Bericht</h3>
            <div className="flex gap-2">
              <Button size="sm" onClick={makeReport} disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90"><Sparkles className="mr-1 h-3 w-3" /> Erstellen</Button>
              <Button size="sm" variant="outline" onClick={makeMail} disabled={busy}><Mail className="mr-1 h-3 w-3" /> Kundenmail</Button>
            </div>
          </div>
          {r.ki_bericht ? (
            <p className="whitespace-pre-wrap text-sm">{r.ki_bericht}</p>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Klick „Erstellen" – die KI schreibt einen professionellen Baustellenbericht.
            </div>
          )}
        </div>
      </div>

      {ki?.body && (
        <div className="mt-6 rounded-2xl border border-brand/30 bg-brand/5 p-5">
          <h3 className="mb-2 font-display font-semibold flex items-center gap-2"><Mail className="h-4 w-4 text-brand" /> Kundenmail-Entwurf</h3>
          <div className="mb-2 text-sm"><strong>Betreff:</strong> {ki.betreff}</div>
          <Textarea rows={10} value={ki.body} readOnly className="bg-background" />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => { navigator.clipboard.writeText(`${ki.betreff}\n\n${ki.body}`); toast.success("Kopiert"); }}>Kopieren</Button>
            <Button size="sm" variant="outline" disabled>An Outlook senden (bald)</Button>
          </div>
        </div>
      )}
    </div>
  );
}
