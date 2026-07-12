import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Camera } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/fotos")({
  head: () => ({ meta: [{ title: "Fotos – MeisterMe" }] }),
  component: () => (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Fotos" subtitle="Bautagebuch und Baustellenfotos." />
      <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center text-muted-foreground">
        <Camera className="mx-auto mb-3 h-10 w-10" />
        Foto-Bautagebuch wird in Kürze verfügbar sein.
      </div>
    </div>
  ),
});
