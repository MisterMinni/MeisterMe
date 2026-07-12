import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("tenant_id")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (!prof?.tenant_id) throw new Error("Kein Betrieb gefunden.");
  const { data: ok } = await supabaseAdmin.rpc("has_permission", {
    _user_id: ctx.userId,
    _permission: "employees:create",
  });
  if (!ok) throw new Error("Keine Berechtigung zur Mitarbeiterverwaltung.");
  return prof.tenant_id as string;
}

async function roleIdFor(admin: any, tenantId: string, roleKey: string) {
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
  .inputValidator((d) =>
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

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        fullName: z.string().optional(),
        phone: z.string().optional().nullable(),
        roleKey: z.string().optional(),
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

    if (data.fullName !== undefined || data.phone !== undefined) {
      await supabaseAdmin
        .from("profiles")
        .update({
          ...(data.fullName !== undefined ? { full_name: data.fullName } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
        })
        .eq("id", data.userId);
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
  .inputValidator((d) =>
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
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
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
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
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
