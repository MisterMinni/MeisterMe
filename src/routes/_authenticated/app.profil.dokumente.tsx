import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfile, useIsAdmin, formatDate } from "@/lib/handwerk";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Upload, Download, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/profil/dokumente")({
  head: () => ({ meta: [{ title: "Dokumente – MeisterMe" }] }),
  component: DokumentePage,
});

function DokumentePage() {
  const { data: profile } = useProfile();
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const userId = profile?.id;

  const { data: docs, isLoading } = useQuery({
    queryKey: ["employee-documents", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId || !profile?.tenant_id) return;
    setUploading(true);
    try {
      const path = `employee-docs/${userId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("handwerk-files")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("employee_documents").insert({
        tenant_id: profile.tenant_id,
        user_id: userId,
        name: file.name,
        kind: file.type || "file",
        storage_path: path,
        uploaded_by: userId,
      });
      if (insErr) throw insErr;
      qc.invalidateQueries({ queryKey: ["employee-documents", userId] });
      toast.success("Dokument hochgeladen");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  async function download(path: string, name: string) {
    const { data, error } = await supabase.storage
      .from("handwerk-files")
      .createSignedUrl(path, 60);
    if (error) return toast.error(error.message);
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.click();
  }

  async function remove(id: string, path: string) {
    if (!confirm("Dokument wirklich löschen?")) return;
    await supabase.storage.from("handwerk-files").remove([path]);
    const { error } = await supabase.from("employee_documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["employee-documents", userId] });
    toast.success("Gelöscht");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {isAdmin ? (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
          <div>
            <div className="text-sm font-semibold">Neues Dokument</div>
            <div className="text-xs text-muted-foreground">
              PDF, Bilder oder Office-Dateien
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={onPick}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Hochladen
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          Neue Dokumente können nur vom Betriebsadmin hinzugefügt werden.
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Lädt …</div>
        ) : !docs || docs.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Noch keine Dokumente vorhanden.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(d.created_at)}
                  </div>
                </div>
                <button
                  onClick={() => download(d.storage_path, d.name)}
                  className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Herunterladen"
                >
                  <Download className="h-4 w-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => remove(d.id, d.storage_path)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
