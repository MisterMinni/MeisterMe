import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const roleSchema = z.enum(["admin", "buero", "bauleiter", "monteur", "azubi"]);

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const { data: prof } = await ctx.supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (!prof?.tenant_id) throw new Error("Kein Betrieb gefunden.");
  const { data: roles } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("tenant_id", prof.tenant_id);
  const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
  if (!isAdmin) throw new Error("Nur Admins dürfen das Team verwalten.");
  return prof.tenant_id as string;
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
        role: roleSchema,
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

    // Ensure profile is in OUR tenant (signup trigger creates a new tenant we discard)
    await supabaseAdmin.from("profiles").upsert({
      id: uid,
      tenant_id: tenantId,
      full_name: data.fullName,
      phone: data.phone ?? null,
    });

    // Remove auto-created admin role in new tenant, then insert real role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, tenant_id: tenantId, role: data.role });

    // Best-effort: delete the orphan tenant created by signup trigger
    await supabaseAdmin
      .from("tenants")
      .delete()
      .eq("name", "__team_member__");

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
        role: roleSchema.optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify member belongs to tenant
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

    if (data.role) {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("tenant_id", tenantId);
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, tenant_id: tenantId, role: data.role });
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

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await requireAdmin(context);
    if (data.userId === context.userId) throw new Error("Du kannst dich nicht selbst löschen.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (prof?.tenant_id !== tenantId) throw new Error("Nutzer gehört nicht zum Betrieb.");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
