import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MODEL = "google/gemini-2.5-flash";

async function callAi(system: string, user: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY fehlt");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("KI-Limit erreicht – bitte kurz warten.");
    if (res.status === 402) throw new Error("KI-Credits aufgebraucht.");
    throw new Error(`KI-Fehler (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

async function callAiJson<T>(system: string, user: string, schema: z.ZodType<T>): Promise<T> {
  const raw = await callAi(
    system +
      "\n\nAntworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt gemäss Schema, ohne Markdown-Code-Fences und ohne Erklärungstext.",
    user
  );
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonStr = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(jsonStr);
  return schema.parse(parsed);
}

/* ------- 1. Sprachbericht parsen ------- */
const VoiceReportSchema = z.object({
  taetigkeit: z.string(),
  aufmass: z
    .array(z.object({ bereich: z.string(), wert: z.string() }))
    .default([]),
  material: z
    .array(z.object({ bezeichnung: z.string(), menge: z.number().nullable().optional(), einheit: z.string().optional() }))
    .default([]),
  arbeitszeit_min: z.number().default(0),
  offene_punkte: z.array(z.string()).default([]),
  interner_bericht: z.string(),
  kunden_zusammenfassung: z.string(),
  rechnungspositionen: z
    .array(z.object({ text: z.string(), menge: z.number().default(1), einheit: z.string().default("Stk"), ep: z.number().default(0) }))
    .default([]),
});

export const parseVoiceReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ text: z.string().min(3), projectName: z.string().optional() }).parse(input)
  )
  .handler(async ({ data }) => {
    return callAiJson(
      "Du bist Assistent für einen deutschen Handwerksbetrieb. Extrahiere aus dem Sprachbericht des Monteurs strukturierte Baustelleninformationen. Denke in Fachbegriffen (Wandfläche, Spachtelmasse, Grundierung, m², lfm). Formuliere den internen Bericht sachlich in ganzen Sätzen. Die Kundenzusammenfassung ist freundlich, kurz, ohne interne Details.",
      `Projekt: ${data.projectName ?? "unbekannt"}\n\nSprachnotiz:\n${data.text}`,
      VoiceReportSchema
    );
  });

/* ------- 2. Professioneller Bericht ------- */
export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        taetigkeit: z.string().default(""),
        material: z.string().default(""),
        offenePunkte: z.string().default(""),
        arbeitszeit: z.string().default(""),
        projekt: z.string().default(""),
        kunde: z.string().default(""),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const text = await callAi(
      "Du erstellst professionelle deutsche Baustellenberichte. Stil: sachlich, kurz, kundentauglich. Struktur: 1) Ausgeführte Arbeiten 2) Verwendetes Material 3) Zeitaufwand 4) Offene Punkte 5) Nächster Schritt. Keine Floskeln.",
      `Kunde: ${data.kunde}\nProjekt: ${data.projekt}\nTätigkeit: ${data.taetigkeit}\nMaterial: ${data.material}\nArbeitszeit: ${data.arbeitszeit}\nOffene Punkte: ${data.offenePunkte}`
    );
    return { text };
  });

/* ------- 3. Kundenmail ------- */
const EmailSchema = z.object({ betreff: z.string(), body: z.string() });

export const generateCustomerEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        kunde: z.string(),
        projekt: z.string().default(""),
        anlass: z.string(),
        inhalt: z.string(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    return callAiJson(
      "Du schreibst freundliche, professionelle deutsche Kundenmails für einen Handwerksbetrieb. Kurz, klar, mit Anrede und Grußformel. Duzen nur wenn der Kontext klar informell ist – sonst Sie.",
      `Kunde: ${data.kunde}\nProjekt: ${data.projekt}\nAnlass: ${data.anlass}\nInhalt:\n${data.inhalt}`,
      EmailSchema
    );
  });

/* ------- 4. Angebot aus Kundenanfrage ------- */
const OfferSchema = z.object({
  titel: z.string(),
  positionen: z.array(
    z.object({
      text: z.string(),
      menge: z.number().default(1),
      einheit: z.string().default("Stk"),
      ep: z.number().default(0),
    })
  ),
  hinweis: z.string().default(""),
});

export const prepareOfferFromRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ anfrage: z.string().min(5), gewerk: z.string().default("Ausbau") }).parse(input)
  )
  .handler(async ({ data }) => {
    return callAiJson(
      "Du bist Kalkulator für einen deutschen Handwerksbetrieb. Erstelle aus der Kundenanfrage einen Angebotsentwurf mit realistischen Positionen (Material + Arbeitsleistung) und marktüblichen Einheitspreisen in EUR für Deutschland. Gib immer sinnvolle Standardwerte, keine Nullen.",
      `Gewerk: ${data.gewerk}\nKundenanfrage:\n${data.anfrage}`,
      OfferSchema
    );
  });

/* ------- 5. Materialschätzung aus Aufmaß ------- */
const MaterialEstSchema = z.object({
  positionen: z.array(
    z.object({
      bezeichnung: z.string(),
      menge: z.number(),
      einheit: z.string(),
      hinweis: z.string().default(""),
    })
  ),
});

export const estimateMaterialFromMeasurement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        gewerk: z.string(),
        bereich: z.string(),
        wandflaeche: z.number().default(0),
        deckenflaeche: z.number().default(0),
        bodenflaeche: z.number().default(0),
        umfang: z.number().default(0),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    return callAiJson(
      "Du berechnest realistische Materialbedarfe für einen deutschen Handwerksbetrieb. Berücksichtige übliche Verbrauchswerte (z.B. Spachtelmasse ~1,2 kg/m², Rollputz ~1,4 kg/m², Wandfarbe ~0,15 l/m² je Anstrich, Anputzleisten in lfm, Fugenband). Gib nur relevante Positionen für das genannte Gewerk aus.",
      `Gewerk: ${data.gewerk}\nBereich: ${data.bereich}\nWandfläche: ${data.wandflaeche} m²\nDeckenfläche: ${data.deckenflaeche} m²\nBodenfläche: ${data.bodenflaeche} m²\nUmfang: ${data.umfang} m`,
      MaterialEstSchema
    );
  });
