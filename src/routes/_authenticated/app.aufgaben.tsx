import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/aufgaben")({
  head: () => ({ meta: [{ title: "Aufgaben – HandwerkPilot" }] }),
  component: Aufgaben,
});

function Aufgaben() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [due, setDue] = useState("");

  const { data: tasks } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: async () => (await supabase.from("tasks").select("*, projects(name)").order("faellig_am", { ascending: true, nullsFirst: false })).data ?? [],
  });
  const { data: projekte } = useQuery({
    queryKey: ["projects-select"],
    queryFn: async () => (await supabase.from("projects").select("id, name")).data ?? [],
  });

  async function add() {
    if (!title) return;
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
    const { error } = await supabase.from("tasks").insert({
      tenant_id: p!.tenant_id as string,
      project_id: projectId || null,
      title,
      faellig_am: due || null,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setDue("");
    qc.invalidateQueries({ queryKey: ["all-tasks"] });
  }
  async function toggle(id: string, done: boolean) {
    await supabase.from("tasks").update({ status: (done ? "erledigt" : "offen") as any }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-tasks"] });
  }

  const heute = new Date().toISOString().slice(0, 10);
  const today = (tasks ?? []).filter((t) => t.status !== "erledigt" && t.faellig_am === heute);
  const overdue = (tasks ?? []).filter((t) => t.status !== "erledigt" && t.faellig_am && t.faellig_am < heute);
  const upcoming = (tasks ?? []).filter((t) => t.status !== "erledigt" && (!t.faellig_am || t.faellig_am > heute));
  const done = (tasks ?? []).filter((t) => t.status === "erledigt");

  return (
    <div>
      <PageHeader title="Aufgaben & Termine" subtitle="Was heute, morgen und nächste Woche ansteht." />

      <div className="mb-6 grid gap-2 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-[1fr_200px_150px_auto]">
        <Input placeholder="Neue Aufgabe…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="h-11" />
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Projekt (optional)" /></SelectTrigger>
          <SelectContent>{projekte?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-11" />
        <Button onClick={add} className="h-11 bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-1 h-4 w-4" /> Hinzufügen</Button>
      </div>

      {!tasks || tasks.length === 0 ? (
        <EmptyState icon={CalIcon} title="Keine Aufgaben" desc="Trag oben ein was zu tun ist." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          <TaskGroup title="Überfällig" tasks={overdue} onToggle={toggle} tone="destructive" />
          <TaskGroup title="Heute" tasks={today} onToggle={toggle} tone="brand" />
          <TaskGroup title="Kommend" tasks={upcoming} onToggle={toggle} />
          <TaskGroup title="Erledigt" tasks={done.slice(0, 20)} onToggle={toggle} tone="muted" />
        </div>
      )}
    </div>
  );
}

function TaskGroup({ title, tasks, onToggle, tone }: { title: string; tasks: any[]; onToggle: (id: string, done: boolean) => void; tone?: "destructive" | "brand" | "muted" }) {
  const border = tone === "destructive" ? "border-destructive/40" : tone === "brand" ? "border-brand" : "border-border";
  return (
    <div className={`rounded-2xl border ${border} bg-card p-4 shadow-card`}>
      <h3 className="mb-3 font-display font-semibold flex items-center justify-between">
        <span>{title}</span><span className="text-sm text-muted-foreground">{tasks.length}</span>
      </h3>
      {tasks.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
        <ul className="space-y-1">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-start gap-2 rounded-lg p-1.5 text-sm hover:bg-secondary/50">
              <input type="checkbox" checked={t.status === "erledigt"} onChange={(e) => onToggle(t.id, e.target.checked)} className="mt-1 h-4 w-4 accent-brand" />
              <div className="flex-1">
                <div className={t.status === "erledigt" ? "line-through text-muted-foreground" : ""}>{t.title}</div>
                <div className="text-xs text-muted-foreground">
                  {(t.projects as any)?.name}{t.faellig_am ? ` · ${formatDate(t.faellig_am)}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
