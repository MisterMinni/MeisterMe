import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/PageHeader";
import { Plug, Mail, Calendar, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/integrationen/outlook")({
  head: () => ({ meta: [{ title: "Outlook – MeisterMe" }] }),
  component: () => (
    <div>
      <PageHeader title="Outlook & Microsoft 365" subtitle="Kalender, E-Mail und Kontakte mit deinem Betrieb verbinden." />

      <div className="mb-6 rounded-3xl border-2 border-dashed border-border bg-card p-8 shadow-card">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Plug className="h-7 w-7" /></span>
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand">Bald verfügbar</div>
            <h2 className="font-display text-2xl font-bold">Mit Microsoft 365 verbinden</h2>
            <p className="mt-2 text-muted-foreground">
              Verbinde MeisterMe mit deinem Outlook-Konto, um Termine zu synchronisieren, E-Mails Kunden zuzuordnen und Kunden-Mails direkt zu versenden.
            </p>
            <Button onClick={() => toast.info("Microsoft-Login ist in Vorbereitung.")} className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90">
              <Plug className="mr-2 h-4 w-4" /> Mit Microsoft 365 verbinden
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card icon={Calendar} title="Kalender-Sync" text="Projekttermine automatisch im Outlook-Kalender." />
        <Card icon={Mail} title="Mail-Zuordnung" text="Eingehende E-Mails erkennen und Projekten zuweisen." />
        <Card icon={Send} title="Mail-Versand" text="Kunden-Mails direkt aus MeisterMe als Outlook-Entwurf oder Versand." />
      </div>
    </div>
  ),
});

function Card({ icon: Icon, title, text }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-brand"><Icon className="h-5 w-5" /></div>
      <h3 className="font-display font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
