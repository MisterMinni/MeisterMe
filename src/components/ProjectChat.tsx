import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/handwerk";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Trash2 } from "lucide-react";

function initials(name: string | null | undefined) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function ProjectChat({ projectId }: { projectId: string }) {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["project-messages", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_messages")
        .select("id, body, created_at, user_id")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      const ids = Array.from(new Set((data ?? []).map((m) => m.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as { id: string; full_name: string | null }[] };
      const nameMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      return (data ?? []).map((m) => ({ ...m, author: nameMap.get(m.user_id) ?? "Kollege" }));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`project-messages-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_messages", filter: `project_id=eq.${projectId}` },
        () => qc.invalidateQueries({ queryKey: ["project-messages", projectId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body || !profile?.tenant_id) return;
    setSending(true);
    const { error } = await supabase.from("project_messages").insert({
      project_id: projectId,
      tenant_id: profile.tenant_id,
      user_id: profile.id,
      body,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setText("");
    qc.invalidateQueries({ queryKey: ["project-messages", projectId] });
  }

  async function del(id: string) {
    if (!confirm("Nachricht löschen?")) return;
    const { error } = await supabase.from("project_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["project-messages", projectId] });
  }

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="border-b border-border bg-secondary/40 px-4 py-3">
        <div className="text-sm font-semibold">Baustellen-Chat</div>
        <div className="text-xs text-muted-foreground">Alle Mitarbeiter dieses Betriebs können mitlesen und schreiben.</div>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-secondary/20 p-4">
        {(messages ?? []).length === 0 && (
          <div className="mt-12 text-center text-sm text-muted-foreground">Noch keine Nachrichten. Schreib die erste!</div>
        )}
        {(messages ?? []).map((m) => {
          const mine = m.user_id === profile?.id;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${mine ? "bg-brand text-brand-foreground" : "bg-primary text-primary-foreground"}`}>
                {initials(m.author)}
              </div>
              <div className={`group max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${mine ? "rounded-br-md bg-brand text-brand-foreground" : "rounded-bl-md bg-card border border-border"}`}>
                {!mine && <div className="mb-0.5 text-xs font-semibold opacity-70">{m.author}</div>}
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div className={`mt-1 flex items-center gap-2 text-[10px] ${mine ? "text-brand-foreground/80" : "text-muted-foreground"}`}>
                  <span>{formatTime(m.created_at)}</span>
                  {mine && (
                    <button onClick={() => del(m.id)} className="opacity-0 transition group-hover:opacity-100">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-end gap-2 border-t border-border bg-background p-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Nachricht schreiben… (Enter senden, Shift+Enter neue Zeile)"
          className="min-h-[44px] resize-none"
          rows={1}
        />
        <Button onClick={send} disabled={sending || !text.trim()} className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
