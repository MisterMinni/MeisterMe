import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { CalendarClock, ListTodo, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSetPageHeader } from "@/components/page-header-context";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, useProfile } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/baustellen/$id/aufgaben")({
  head: () => ({ meta: [{ title: "Baustellenaufgaben – MeisterMe" }] }),
  component: SiteTasksPage,
});

const initialForm = { title: "", priority: "normal", dueDate: "", assigneeId: "none" };
const statusLabels = { offen: "Offen", in_arbeit: "In Arbeit", erledigt: "Erledigt" } as const;
const priorityLabels: Record<string, string> = { niedrig: "Niedrig", normal: "Normal", hoch: "Hoch" };

export function SiteTasksPage() {
  const { id } = Route.useParams();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  useSetPageHeader({ title: "Aufgaben & Mängel", backTo: `/app/baustellen/${id}/info` });

  const { data: tasks } = useQuery({
    queryKey: ["site-tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("project_id", id).order("faellig_am", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["site-task-employees", profile?.tenant_id],
    enabled: Boolean(profile?.tenant_id),
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id, auth_user_id, full_name, status").eq("status", "active").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const employeesByAuthId = new Map((employees ?? []).filter((employee) => employee.auth_user_id).map((employee) => [employee.auth_user_id!, employee.full_name]));

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.tenant_id) return;
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      tenant_id: profile.tenant_id,
      project_id: id,
      title: form.title.trim(),
      prioritaet: form.priority,
      faellig_am: form.dueDate || null,
      assignee_id: form.assigneeId === "none" ? null : form.assigneeId,
      status: "offen",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Aufgabe angelegt");
    setForm(initialForm);
    setOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["site-tasks", id] });
  }

  async function updateStatus(taskId: string, status: keyof typeof statusLabels) {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
    if (error) return toast.error(error.message);
    await queryClient.invalidateQueries({ queryKey: ["site-tasks", id] });
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5"><div><h2 className="font-display text-lg font-bold">Aufgaben & Mängel</h2><p className="text-sm text-muted-foreground">Zuständigkeit, Priorität und Fälligkeit direkt an der Baustelle.</p></div><Button type="button" onClick={() => setOpen(true)} className="bg-brand text-white hover:bg-brand/90"><Plus className="h-4 w-4" /> Aufgabe</Button></header>
      <div className="p-4 sm:p-5">
        {tasks?.length ? <div className="space-y-3">{tasks.map((task) => { const overdue = task.faellig_am && task.faellig_am < new Date().toISOString().slice(0, 10) && task.status !== "erledigt"; return <article key={task.id} className={`grid gap-3 rounded-xl border p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center ${overdue ? "border-red-200 bg-red-50/50" : "border-border"}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className={`font-semibold ${task.status === "erledigt" ? "text-muted-foreground line-through" : ""}`}>{task.title}</h3><Badge variant={task.prioritaet === "hoch" ? "destructive" : "secondary"}>{priorityLabels[task.prioritaet ?? "normal"] ?? task.prioritaet}</Badge></div><p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{task.faellig_am && <span className={overdue ? "font-semibold text-red-700" : ""}><CalendarClock className="mr-1 inline h-3.5 w-3.5" />{formatDate(task.faellig_am)}</span>}<span>{task.assignee_id ? employeesByAuthId.get(task.assignee_id) ?? "Zugewiesen" : "Nicht zugewiesen"}</span></p></div><Select value={task.status ?? "offen"} onValueChange={(status) => updateStatus(task.id, status as keyof typeof statusLabels)}><SelectTrigger className="w-full md:w-36"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>{overdue && <Badge variant="destructive">Überfällig</Badge>}</article>; })}</div> : <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border text-center"><div><ListTodo className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-medium">Noch keine Aufgaben</p><p className="text-sm text-muted-foreground">Erfasse offene Arbeiten oder Mängel direkt am Projekt.</p></div></div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-lg"><form onSubmit={createTask}><DialogHeader><DialogTitle>Aufgabe anlegen</DialogTitle></DialogHeader><div className="space-y-4 py-5"><div><Label htmlFor="task-title">Aufgabe / Mangel</Label><Input id="task-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="z. B. Fensterbank nacharbeiten" required /></div><div><Label>Priorität</Label><Select value={form.priority} onValueChange={(priority) => setForm({ ...form, priority })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="niedrig">Niedrig</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="hoch">Hoch</SelectItem></SelectContent></Select></div><div><Label htmlFor="task-due">Fällig am</Label><Input id="task-due" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></div><div><Label>Zuständig</Label><Select value={form.assigneeId} onValueChange={(assigneeId) => setForm({ ...form, assigneeId })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Noch niemand</SelectItem>{(employees ?? []).filter((employee) => employee.auth_user_id).map((employee) => <SelectItem key={employee.id} value={employee.auth_user_id!}>{employee.full_name}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button><Button type="submit" disabled={saving} className="bg-brand text-white hover:bg-brand/90">{saving ? "Speichert …" : "Aufgabe anlegen"}</Button></DialogFooter></form></DialogContent></Dialog>
    </section>
  );
}

