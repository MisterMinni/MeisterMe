import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/handwerk";
import { toast } from "sonner";
import { Send, Trash2, Paperclip, Loader2, Search, X } from "lucide-react";
import chatBg from "@/assets/chat-bg-houses.jpg";

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
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Heute";
  if (sameDay(d, yesterday)) return "Gestern";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}

type Msg = {
  id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  author: string;
};

export function ProjectChat({ projectId }: { projectId: string }) {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [currentDay, setCurrentDay] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["project-messages", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_messages")
        .select("id, body, image_url, created_at, user_id")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      const ids = Array.from(new Set((data ?? []).map((m) => m.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as { id: string; full_name: string | null }[] };
      const nameMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      return (data ?? []).map((m) => ({ ...m, author: nameMap.get(m.user_id) ?? "Kollege" })) as Msg[];
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

  // Sign image paths
  useEffect(() => {
    const missing = (messages ?? [])
      .map((m) => m.image_url)
      .filter((p): p is string => !!p && !signed[p]);
    if (missing.length === 0) return;
    (async () => {
      const { data } = await supabase.storage.from("chat-images").createSignedUrls(missing, 60 * 60);
      const next: Record<string, string> = {};
      (data ?? []).forEach((r) => {
        if (r.path && r.signedUrl) next[r.path] = r.signedUrl;
      });
      if (Object.keys(next).length) setSigned((prev) => ({ ...prev, ...next }));
    })();
  }, [messages, signed]);

  const grouped = useMemo(() => {
    const term = searchQ.trim().toLowerCase();
    const src = term
      ? (messages ?? []).filter((m) => (m.body ?? "").toLowerCase().includes(term))
      : (messages ?? []);
    const out: { day: string; items: Msg[] }[] = [];
    src.forEach((m) => {
      const label = formatDayLabel(m.created_at);
      const last = out[out.length - 1];
      if (last && last.day === label) last.items.push(m);
      else out.push({ day: label, items: [m] });
    });
    return out;
  }, [messages, searchQ]);

  // Track topmost visible message day for sticky date chip
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const update = () => {
      const topEdge = container.getBoundingClientRect().top;
      const nodes = container.querySelectorAll<HTMLElement>("[data-day]");
      let found: string | null = null;
      for (const el of Array.from(nodes)) {
        const r = el.getBoundingClientRect();
        if (r.bottom >= topEdge + 8) {
          found = el.dataset.day ?? null;
          break;
        }
      }
      if (found) setCurrentDay(found);
    };
    update();
    container.addEventListener("scroll", update, { passive: true });
    return () => container.removeEventListener("scroll", update);
  }, [grouped]);

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

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile?.id || !profile.tenant_id) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Nur Bilder erlaubt");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${profile.id}/${projectId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("chat-images")
      .upload(path, file, { contentType: file.type });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { error } = await supabase.from("project_messages").insert({
      project_id: projectId,
      tenant_id: profile.tenant_id,
      user_id: profile.id,
      body: null,
      image_url: path,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["project-messages", projectId] });
  }

  async function del(id: string) {
    if (!confirm("Nachricht löschen?")) return;
    const { error } = await supabase.from("project_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["project-messages", projectId] });
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Message list w/ hand-drawn houses background */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto"
        style={{
          backgroundImage: `url(${chatBg})`,
          backgroundRepeat: "repeat",
          backgroundSize: "420px auto",
        }}
      >
        {currentDay && grouped.length > 0 && (
          <div className="pointer-events-none sticky top-2 z-10 flex justify-center">
            <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
              {currentDay}
            </span>
          </div>
        )}
        <div className="relative space-y-3 px-3 py-4">
          {grouped.length === 0 && (
            <div className="mt-16 text-center text-sm text-muted-foreground">
              Noch keine Nachrichten. Schreib die erste!
            </div>
          )}
          {grouped.map((group) => (
            <div key={group.day} className="space-y-2">
              {group.items.map((m) => {
                const mine = m.user_id === profile?.id;
                const imgUrl = m.image_url ? signed[m.image_url] : null;
                return (
                  <div key={m.id} data-day={group.day} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                    {!mine && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-brand-foreground shadow-sm">
                        {initials(m.author)}
                      </div>
                    )}
                    <div
                      className={`group relative max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        mine
                          ? "rounded-br-md bg-brand text-brand-foreground"
                          : "rounded-bl-md border border-border bg-white text-foreground"
                      }`}
                    >
                      {!mine && (
                        <div className="mb-0.5 text-xs font-semibold text-brand">{m.author}</div>
                      )}
                      {m.image_url && (
                        <div className="mb-1 overflow-hidden rounded-lg">
                          {imgUrl ? (
                            <img src={imgUrl} alt="" className="max-h-64 w-auto" />
                          ) : (
                            <div className="flex h-32 w-48 items-center justify-center bg-muted">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      )}
                      {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                      <div
                        className={`mt-1 flex items-center justify-end gap-2 text-[10px] ${
                          mine ? "text-brand-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        <span>{formatTime(m.created_at)}</span>
                        {mine && (
                          <button
                            onClick={() => del(m.id)}
                            className="opacity-0 transition group-hover:opacity-100"
                            aria-label="Löschen"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 border-t border-border bg-background px-2 py-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary disabled:opacity-50"
          aria-label="Bild anhängen"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Nachricht"
          rows={1}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-3xl border border-border bg-secondary/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !text.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-sm transition hover:bg-brand/90 disabled:opacity-50"
          aria-label="Senden"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
