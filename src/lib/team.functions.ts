import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

async function requireAdmin(ctx: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data: prof } = await ctx.supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (!prof?.tenant_id) throw new Error("Kein Betrieb gefunden.");
  const { data: ok } = await ctx.supabase.rpc("has_permission", {
    _user_id: ctx.userId,
    _permission: "employees:create",
  });
  if (!ok) throw new Error("Keine Berechtigung zur Mitarbeiterverwaltung.");
  return prof.tenant_id as string;
}

async function roleIdFor(admin: SupabaseClient<Database>, tenantId: string, roleKey: string) {
  const { data } = await admin
    .from("roles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("key", roleKey)
    .maybeSingle();
  if (!data?.id) throw new Error(`Rolle "${roleKey}" wurde nicht gefunden.`);
  return data.id as string;
}

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8, "Mindestens 8 Zeichen"),
        fullName: z.string().min(1),
        phone: z.string().optional(),
        roleKey: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, betrieb: "__team_member__" },
    });
    if (error || !created?.user) throw new Error(error?.message ?? "Anlegen fehlgeschlagen");

    const uid = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: uid,
      tenant_id: tenantId,
      full_name: data.fullName,
      phone: data.phone ?? null,
    });

    const roleId = await roleIdFor(supabaseAdmin, tenantId, data.roleKey);
    await supabaseAdmin.from("user_role_assignments").delete().eq("user_id", uid);
    await supabaseAdmin
      .from("user_role_assignments")
      .insert({ user_id: uid, tenant_id: tenantId, role_id: roleId });

    await supabaseAdmin.from("tenants").delete().eq("name", "__team_member__");

    return { id: uid };
  });

export const listTeamMemberEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenantId);
    const ids = new Set((profs ?? []).map((p) => p.id));
    const map: Record<string, string> = {};
    let page = 1;
    // paginate through auth users
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      for (const u of data?.users ?? []) {
        if (ids.has(u.id) && u.email) map[u.id] = u.email;
      }
      if (!data?.users || data.users.length < 200) break;
      page += 1;
    }
    return map;
  });

export const getTeamMemberDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.userId)
      .maybeSingle();
    if (!prof || prof.tenant_id !== tenantId) throw new Error("Nutzer gehört nicht zum Betrieb.");
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    return { profile: prof, email: userRes?.user?.email ?? null };
  });

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        fullName: z.string().optional(),
        phone: z.string().optional().nullable(),
        roleKey: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional().nullable(),
        employee_number: z.string().optional().nullable(),
        entry_date: z.string().optional().nullable(),
        exit_date: z.string().optional().nullable(),
        weekly_hours: z.number().optional().nullable(),
        work_time_model: z.string().optional().nullable(),
        vacation_days_per_year: z.number().int().optional().nullable(),
        cost_center: z.string().optional().nullable(),
        subgroup: z.string().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (prof?.tenant_id !== tenantId) throw new Error("Nutzer gehört nicht zum Betrieb.");

    const profileFields = [
      "fullName",
      "phone",
      "address",
      "employee_number",
      "entry_date",
      "exit_date",
      "weekly_hours",
      "work_time_model",
      "vacation_days_per_year",
      "cost_center",
      "subgroup",
    ] as const;
    const dbMap: Record<string, string> = { fullName: "full_name" };
    const patch: Record<string, unknown> = {};
    for (const k of profileFields) {
      if ((data as Record<string, unknown>)[k] !== undefined) {
        patch[dbMap[k] ?? k] = (data as Record<string, unknown>)[k];
      }
    }
    if (Object.keys(patch).length > 0) {
      await supabaseAdmin.from("profiles").update(patch as never).eq("id", data.userId);
    }

    if (data.email) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        email: data.email,
      });
      if (error) throw new Error(error.message);
    }

    if (data.roleKey) {
      const roleId = await roleIdFor(supabaseAdmin, tenantId, data.roleKey);
      await supabaseAdmin
        .from("user_role_assignments")
        .delete()
        .eq("user_id", data.userId)
        .eq("tenant_id", tenantId);
      await supabaseAdmin
        .from("user_role_assignments")
        .insert({ user_id: data.userId, tenant_id: tenantId, role_id: roleId });
    }
    return { ok: true };
  });

export const resetTeamMemberPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(8) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (prof?.tenant_id !== tenantId) throw new Error("Nutzer gehört nicht zum Betrieb.");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deactivateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await requireAdmin(context);
    if (data.userId === context.userId) throw new Error("Du kannst dich nicht selbst deaktivieren.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (prof?.tenant_id !== tenantId) throw new Error("Nutzer gehört nicht zum Betrieb.");
    await supabaseAdmin
      .from("profiles")
      .update({ disabled_at: new Date().toISOString(), exit_date: new Date().toISOString().slice(0, 10) })
      .eq("id", data.userId);
    return { ok: true };
  });

export const reactivateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (prof?.tenant_id !== tenantId) throw new Error("Nutzer gehört nicht zum Betrieb.");
    await supabaseAdmin
      .from("profiles")
      .update({ disabled_at: null, exit_date: null })
      .eq("id", data.userId);
    return { ok: true };
  });
