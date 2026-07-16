import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSetPageHeader } from "@/components/page-header-context";
import { Images, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/baustellen/$id/medien")({
  head: () => ({ meta: [{ title: "Medien – MeisterMe" }] }),
  component: MedienPage,
});

function MedienPage() {
  const { id } = Route.useParams();

  useSetPageHeader({
    title: "Medien, Links, Doks",
    backTo: `/app/baustellen/${id}/info`,
  });

  const { data: paths, isLoading } = useQuery({
    queryKey: ["site-media", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_messages")
        .select("id, image_url, created_at, user_id")
        .eq("project_id", id)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false });
      return (data ?? []) as { id: string; image_url: string; created_at: string; user_id: string }[];
    },
  });

  const [signed, setSigned] = useState<Record<string, string>>({});
  useEffect(() => {
    const missing = (paths ?? []).map((p) => p.image_url).filter((p) => p && !signed[p]);
    if (missing.length === 0) return;
    (async () => {
      const { data } = await supabase.storage.from("chat-images").createSignedUrls(missing, 60 * 60);
      const next: Record<string, string> = {};
      (data ?? []).forEach((r) => {
        if (r.path && r.signedUrl) next[r.path] = r.signedUrl;
      });
      if (Object.keys(next).length) setSigned((prev) => ({ ...prev, ...next }));
    })();
  }, [paths, signed]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Lade Medien …
      </div>
    );
  }

  if (!paths || paths.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Images className="h-6 w-6" />
        </div>
        <p className="text-sm">Noch keine Medien in dieser Baustelle.</p>
      </div>
    );
  }

  // Group by day
  const groups: { day: string; items: typeof paths }[] = [];
  const fmtDay = (iso: string) => {
    const d = new Date(iso);
    const t = new Date();
    const y = new Date(); y.setDate(t.getDate() - 1);
    const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (same(d, t)) return "Heute";
    if (same(d, y)) return "Gestern";
    return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(d);
  };
  paths.forEach((p) => {
    const day = fmtDay(p.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(p);
    else groups.push({ day, items: [p] });
  });

  return (
    <div className="space-y-6 pb-8">
      {groups.map((g) => (
        <section key={g.day}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.day}</h2>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
            {g.items.map((it) => {
              const url = signed[it.image_url];
              return (
                <a
                  key={it.id}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square overflow-hidden rounded-lg bg-secondary"
                >
                  {url ? (
                    <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
