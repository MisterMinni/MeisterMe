import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { BrainCircuit, Calculator, ClipboardCheck, Copy, FileText, Mail, Mic2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  estimateMaterialFromMeasurement,
  generateCustomerEmail,
  generateReport,
  parseVoiceReport,
  prepareOfferFromRequest,
} from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/app/ki-assistent")({
  head: () => ({ meta: [{ title: "KI-Assistent – MeisterMe" }] }),
  component: AiAssistant,
});

type ToolId = "voice" | "report" | "email" | "offer" | "material";

const tools: Array<{ id: ToolId; label: string; description: string; icon: typeof Sparkles }> = [
  { id: "voice", label: "Sprachbericht", description: "Notizen in Baustellendaten umwandeln", icon: Mic2 },
  { id: "report", label: "Baubericht", description: "Professionellen Tagesbericht formulieren", icon: FileText },
  { id: "email", label: "Kundenmail", description: "Freundliche E-Mail vorbereiten", icon: Mail },
  { id: "offer", label: "Angebot", description: "Anfrage in Positionen zerlegen", icon: ClipboardCheck },
  { id: "material", label: "Material", description: "Bedarf aus dem Aufmaß schätzen", icon: Calculator },
];

function AiAssistant() {
  const parseVoice = useServerFn(parseVoiceReport);
  const makeReport = useServerFn(generateReport);
  const makeEmail = useServerFn(generateCustomerEmail);
  const makeOffer = useServerFn(prepareOfferFromRequest);
  const estimateMaterial = useServerFn(estimateMaterialFromMeasurement);

  const [active, setActive] = useState<ToolId>("voice");
  const [project, setProject] = useState("");
  const [customer, setCustomer] = useState("");
  const [trade, setTrade] = useState("Stuckateur / Maler");
  const [context, setContext] = useState("");
  const [secondary, setSecondary] = useState("");
  const [wallArea, setWallArea] = useState("");
  const [ceilingArea, setCeilingArea] = useState("");
  const [floorArea, setFloorArea] = useState("");
  const [perimeter, setPerimeter] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  function selectTool(id: ToolId) {
    setActive(id);
    setResult("");
    setContext("");
    setSecondary("");
  }

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult("");
    try {
      if (active === "voice") {
        const response = await parseVoice({ data: { text: context, projectName: project || undefined } });
        setResult(JSON.stringify(response, null, 2));
      } else if (active === "report") {
        const response = await makeReport({
          data: {
            projekt: project,
            kunde: customer,
            taetigkeit: context,
            material: secondary,
            arbeitszeit: "",
            offenePunkte: "",
          },
        });
        setResult(response.text);
      } else if (active === "email") {
        const response = await makeEmail({
          data: { kunde: customer || "Kundin/Kunde", projekt: project, anlass: secondary || "Projektstatus", inhalt: context },
        });
        setResult(`${response.betreff}\n\n${response.body}`);
      } else if (active === "offer") {
        const response = await makeOffer({ data: { anfrage: context, gewerk: trade } });
        setResult(JSON.stringify(response, null, 2));
      } else {
        const response = await estimateMaterial({
          data: {
            gewerk: trade,
            bereich: context,
            wandflaeche: Number(wallArea) || 0,
            deckenflaeche: Number(ceilingArea) || 0,
            bodenflaeche: Number(floorArea) || 0,
            umfang: Number(perimeter) || 0,
          },
        });
        setResult(JSON.stringify(response, null, 2));
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "KI-Anfrage fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    await navigator.clipboard.writeText(result);
    toast.success("Ergebnis kopiert");
  }

  const activeTool = tools.find((tool) => tool.id === active)!;

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-border bg-card p-3 shadow-card">
        <div className="mb-3 flex items-center gap-3 px-2 py-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white"><BrainCircuit className="h-6 w-6" /></span>
          <div>
            <h2 className="font-display font-bold text-slate-900">KI-Werkstatt</h2>
            <p className="text-xs text-muted-foreground">Sicher über deinen eigenen Anbieter</p>
          </div>
        </div>
        <nav className="grid gap-1 sm:grid-cols-2 xl:grid-cols-1">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => selectTool(tool.id)}
                className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${active === tool.id ? "bg-brand text-white" : "hover:bg-secondary"}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{tool.label}</span>
                  <span className={`block truncate text-xs ${active === tool.id ? "text-white/70" : "text-muted-foreground"}`}>{tool.description}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <header className="border-b border-border bg-gradient-to-r from-[#edf6ff] to-white px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <activeTool.icon className="h-6 w-6 text-brand" />
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">{activeTool.label}</h1>
              <p className="text-sm text-muted-foreground">{activeTool.description}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-2">
          <form onSubmit={run} className="space-y-4">
            {(active === "voice" || active === "report" || active === "email") && (
              <div className="space-y-1.5">
                <Label htmlFor="project">Projekt / Baustelle</Label>
                <Input id="project" value={project} onChange={(event) => setProject(event.target.value)} placeholder="z. B. Fassade Müllerstraße" />
              </div>
            )}
            {(active === "report" || active === "email") && (
              <div className="space-y-1.5">
                <Label htmlFor="customer">Kunde</Label>
                <Input id="customer" value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Name oder Firma" />
              </div>
            )}
            {(active === "offer" || active === "material") && (
              <div className="space-y-1.5">
                <Label htmlFor="trade">Gewerk</Label>
                <Input id="trade" value={trade} onChange={(event) => setTrade(event.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="context">
                {active === "voice" ? "Sprachnotiz / Rohtext" : active === "report" ? "Ausgeführte Arbeiten" : active === "email" ? "Inhalt und gewünschte Aussage" : active === "offer" ? "Kundenanfrage" : "Bereich / Bauteil"}
              </Label>
              <Textarea id="context" rows={active === "material" ? 3 : 8} value={context} onChange={(event) => setContext(event.target.value)} required placeholder="Stichpunkte genügen – die KI strukturiert und formuliert." />
            </div>
            {(active === "report" || active === "email") && (
              <div className="space-y-1.5">
                <Label htmlFor="secondary">{active === "report" ? "Material" : "Anlass / Betreff"}</Label>
                <Input id="secondary" value={secondary} onChange={(event) => setSecondary(event.target.value)} />
              </div>
            )}
            {active === "material" && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Wandfläche m²", wallArea, setWallArea],
                  ["Deckenfläche m²", ceilingArea, setCeilingArea],
                  ["Bodenfläche m²", floorArea, setFloorArea],
                  ["Umfang lfm", perimeter, setPerimeter],
                ].map(([label, value, setter]) => (
                  <div key={label as string} className="space-y-1.5">
                    <Label>{label as string}</Label>
                    <Input type="number" min="0" step="0.01" value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} />
                  </div>
                ))}
              </div>
            )}
            <Button type="submit" disabled={loading} className="h-11 w-full bg-brand text-white hover:bg-brand/90">
              <Sparkles className="h-4 w-4" /> {loading ? "KI arbeitet …" : "Entwurf erstellen"}
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">KI-Ergebnisse sind Entwürfe. Preise, Mengen, Fristen und rechtlich relevante Texte vor dem Versand fachlich prüfen.</p>
          </form>

          <div className="min-h-[360px] rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            {result ? (
              <div className="flex h-full flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">KI-Entwurf</span>
                  <Button type="button" size="sm" variant="outline" onClick={copyResult}><Copy className="h-3.5 w-3.5" /> Kopieren</Button>
                </div>
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-800">{result}</pre>
              </div>
            ) : (
              <div className="grid h-full min-h-[320px] place-items-center text-center">
                <div>
                  <Sparkles className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-600">Hier erscheint dein Entwurf</p>
                  <p className="mt-1 text-xs text-slate-400">Die Eingaben werden erst beim Absenden an den konfigurierten KI-Anbieter übertragen.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
