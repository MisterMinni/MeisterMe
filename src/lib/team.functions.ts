import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

type AuthContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

export type TeamMemberAccessStatus =
  | "no_access"
  | "invited"
  | "expired"
  | "active"
  | "disabled";

export type TeamMemberSummary = {
  id: string;
  authUserId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  employeeNumber: string | null;
  subgroup: string | null;
  status: "active" | "inactive" | "exited";
  disabledAt: string | null;
  role: { id: string; key: string; name: string } | null;
  invitation: {
    id: string;
    status: string;
    sentAt: string | null;
    expiresAt: string;
  } | null;
  accessStatus: TeamMemberAccessStatus;
};

const nullableString = z.string().trim().optional().nullable();

const employeeFields = {
  fullName: z.string().trim().min(1, "Name darf nicht leer sein."),
  email: z.string().trim().email().optional().nullable(),
  phone: nullableString,
  roleKey: z.string().min(1),
  address: nullableString,
  employeeNumber: nullableString,
  entryDate: nullableString,
  exitDate: nullableString,
  weeklyHours: z.number().min(0).optional().nullable(),
  workTimeModel: nullableString,
  vacationDaysPerYear: z.number().int().min(0).optional().nullable(),
  costCenter: nullableString,
  subgroup: nullableString,
};

function clean(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeEmail(value: string | null | undefined) {
  return clean(value)?.toLowerCase() ?? null;
}

async function hasPermission(ctx: AuthContext, permission: string) {
  const { data, error } = await ctx.supabase.rpc("has_permission", {
    _user_id: ctx.userId,
    _permission: permission,
  });
  if (error) throw new Error("Berechtigung konnte nicht geprüft werden.");
  return data === true;
}

async function requirePermission(ctx: AuthContext, permission: string) {
  const { data: profile, error } = await ctx.supabase
    .from("profiles")
    .select("tenant_id, disabled_at")
    .eq("id", ctx.userId)
    .maybeSingle();

  if (error || !profile?.tenant_id || profile.disabled_at) {
    throw new Error("Kein aktiver Betrieb gefunden.");
  }
  if (!(await hasPermission(ctx, permission))) {
    throw new Error("Keine Berechtigung für diese Mitarbeiteraktion.");
  }
  return profile.tenant_id;
}

async function roleFor(
  admin: SupabaseClient<Database>,
  tenantId: string,
  roleKey: string,
) {
  const { data, error } = await admin
    .from("roles")
    .select("id, key, name")
    .eq("tenant_id", tenantId)
    .eq("key", roleKey)
    .maybeSingle();
  if (error || !data) throw new Error(`Rolle „${roleKey}“ wurde nicht gefunden.`);
  return data;
}

async function assertRoleAssignmentAllowed(ctx: AuthContext, roleKey: string) {
  if (
    ["unternehmensinhaber", "administrator"].includes(roleKey) &&
    !(await hasPermission(ctx, "roles:manage"))
  ) {
    throw new Error("Nur Inhaber oder Administratoren dürfen diese Rolle vergeben.");
  }
}

async function writeAudit(
  admin: SupabaseClient<Database>,
  input: {
    tenantId: string;
    actorId: string;
    action: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await admin.from("audit_log").insert({
    tenant_id: input.tenantId,
    actor_id: input.actorId,
    action: input.action,
    entity: "employee",
    entity_id: input.entityId ?? null,
    metadata: (input.metadata as Json | undefined) ?? null,
  });
}

function inviteRedirectUrl() {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return `${explicit.replace(/\/$/, "")}/accept-invite`;

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return `https://${productionHost}/accept-invite`;

  return "https://meister-me.vercel.app/accept-invite";
}

async function sendInvitation(input: {
  admin: SupabaseClient<Database>;
  tenantId: string;
  employeeId: string;
  actorId: string;
}) {
  const { admin, tenantId, employeeId, actorId } = input;
  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id, full_name, email, role_id, auth_user_id, status")
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (employeeError || !employee) throw new Error("Mitarbeiter wurde nicht gefunden.");
  if (employee.status !== "active") throw new Error("Der Mitarbeiter ist nicht aktiv.");
  if (employee.auth_user_id) throw new Error("Für diesen Mitarbeiter besteht bereits ein Zugang.");
  if (!employee.email) throw new Error("Für eine Einladung wird eine E-Mail-Adresse benötigt.");
  if (!employee.role_id) throw new Error("Bitte zuerst eine Rolle auswählen.");

  await admin
    .from("employee_invitations")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("employee_id", employeeId)
    .in("status", ["pending", "sent"]);

  const { data: invitation, error: invitationError } = await admin
    .from("employee_invitations")
    .insert({
      tenant_id: tenantId,
      employee_id: employeeId,
      role_id: employee.role_id,
      email: employee.email,
      status: "pending",
      invited_by: actorId,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (invitationError || !invitation) {
    throw new Error(invitationError?.message ?? "Einladung konnte nicht angelegt werden.");
  }

  const { data: invited, error: authError } = await admin.auth.admin.inviteUserByEmail(
    employee.email,
    {
      data: { full_name: employee.full_name },
      redirectTo: inviteRedirectUrl(),
    },
  );

  if (authError || !invited.user) {
    await admin
      .from("employee_invitations")
      .update({
        status: "failed",
        error_message: authError?.message ?? "Supabase hat keinen Nutzer zurückgegeben.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);
    throw new Error(authError?.message ?? "Einladung konnte nicht versendet werden.");
  }

  await admin
    .from("employee_invitations")
    .update({
      status: "sent",
      auth_user_id: invited.user.id,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", invitation.id);

  await writeAudit(admin, {
    tenantId,
    actorId,
    action: "employee.invited",
    entityId: employeeId,
    metadata: { invitation_id: invitation.id, email: employee.email },
  });

  return { invitationId: invitation.id };
}

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await requirePermission(context, "employees:read");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: employees, error }, { data: roles }, { data: invitations }] =
      await Promise.all([
        supabaseAdmin
          .from("employees")
          .select(
            "id, auth_user_id, role_id, full_name, email, phone, employee_number, subgroup, status, disabled_at",
          )
          .eq("tenant_id", tenantId)
          .order("full_name"),
        supabaseAdmin.from("roles").select("id, key, name").eq("tenant_id", tenantId),
        supabaseAdmin
          .from("employee_invitations")
          .select("id, employee_id, status, sent_at, expires_at, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
      ]);

    if (error) throw new Error(error.message);
    const roleMap = new Map((roles ?? []).map((role) => [role.id, role]));
    const latestInvitation = new Map<string, NonNullable<typeof invitations>[number]>();
    for (const invitation of invitations ?? []) {
      if (!latestInvitation.has(invitation.employee_id)) {
        latestInvitation.set(invitation.employee_id, invitation);
      }
    }

    return (employees ?? []).map((employee): TeamMemberSummary => {
      const invitation = latestInvitation.get(employee.id) ?? null;
      const invitationExpired =
        invitation &&
        ["pending", "sent"].includes(invitation.status) &&
        new Date(invitation.expires_at).getTime() < Date.now();

      let accessStatus: TeamMemberAccessStatus = "no_access";
      if (employee.status !== "active" || employee.disabled_at) accessStatus = "disabled";
      else if (invitation?.status === "accepted" && employee.auth_user_id) accessStatus = "active";
      else if (invitationExpired || invitation?.status === "expired") accessStatus = "expired";
      else if (employee.auth_user_id || invitation?.status === "sent") accessStatus = "invited";
      if (employee.auth_user_id && !invitation) accessStatus = "active";

      return {
        id: employee.id,
        authUserId: employee.auth_user_id,
        fullName: employee.full_name,
        email: employee.email,
        phone: employee.phone,
        employeeNumber: employee.employee_number,
        subgroup: employee.subgroup,
        status: employee.status as TeamMemberSummary["status"],
        disabledAt: employee.disabled_at,
        role: employee.role_id ? (roleMap.get(employee.role_id) ?? null) : null,
        invitation: invitation
          ? {
              id: invitation.id,
              status: invitationExpired ? "expired" : invitation.status,
              sentAt: invitation.sent_at,
              expiresAt: invitation.expires_at,
            }
          : null,
        accessStatus,
      };
    });
  });

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        ...employeeFields,
        grantAccess: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await requirePermission(context, "employees:create");
    await assertRoleAssignmentAllowed(context, data.roleKey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const role = await roleFor(supabaseAdmin, tenantId, data.roleKey);
    const email = normalizeEmail(data.email);
    if (data.grantAccess && !email) {
      throw new Error("Für den App-Zugang wird eine E-Mail-Adresse benötigt.");
    }

    const { data: employee, error } = await supabaseAdmin
      .from("employees")
      .insert({
        tenant_id: tenantId,
        role_id: role.id,
        full_name: data.fullName,
        email,
        phone: clean(data.phone),
        address: clean(data.address),
        employee_number: clean(data.employeeNumber),
        entry_date: clean(data.entryDate),
        exit_date: clean(data.exitDate),
        weekly_hours: data.weeklyHours ?? null,
        work_time_model: clean(data.workTimeModel),
        vacation_days_per_year: data.vacationDaysPerYear ?? 24,
        cost_center: clean(data.costCenter),
        subgroup: clean(data.subgroup),
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (error || !employee) throw new Error(error?.message ?? "Anlegen fehlgeschlagen.");
    await writeAudit(supabaseAdmin, {
      tenantId,
      actorId: context.userId,
      action: "employee.created",
      entityId: employee.id,
      metadata: { app_access_requested: data.grantAccess },
    });

    let invitationError: string | null = null;
    if (data.grantAccess) {
      try {
        await sendInvitation({
          admin: supabaseAdmin,
          tenantId,
          employeeId: employee.id,
          actorId: context.userId,
        });
      } catch (cause) {
        invitationError = cause instanceof Error ? cause.message : "Einladung fehlgeschlagen.";
      }
    }

    return { id: employee.id, invitationSent: data.grantAccess && !invitationError, invitationError };
  });

export const getTeamMemberDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ employeeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const tenantId = await requirePermission(context, "employees:read");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: employee, error } = await supabaseAdmin
      .from("employees")
      .select("*")
      .eq("id", data.employeeId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error || !employee) throw new Error("Mitarbeiter wurde nicht gefunden.");
    return employee;
  });

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        employeeId: z.string().uuid(),
        ...employeeFields,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await requirePermission(context, "employees:update");
    await assertRoleAssignmentAllowed(context, data.roleKey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const role = await roleFor(supabaseAdmin, tenantId, data.roleKey);
    const { data: current } = await supabaseAdmin
      .from("employees")
      .select("auth_user_id, role_id")
      .eq("id", data.employeeId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!current) throw new Error("Mitarbeiter wurde nicht gefunden.");
    if (current.auth_user_id === context.userId && current.role_id !== role.id) {
      throw new Error("Die eigene Rolle kann hier nicht geändert werden.");
    }

    const { error } = await supabaseAdmin
      .from("employees")
      .update({
        role_id: role.id,
        full_name: data.fullName,
        email: normalizeEmail(data.email),
        phone: clean(data.phone),
        address: clean(data.address),
        employee_number: clean(data.employeeNumber),
        entry_date: clean(data.entryDate),
        exit_date: clean(data.exitDate),
        weekly_hours: data.weeklyHours ?? null,
        work_time_model: clean(data.workTimeModel),
        vacation_days_per_year: data.vacationDaysPerYear ?? null,
        cost_center: clean(data.costCenter),
        subgroup: clean(data.subgroup),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.employeeId)
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);

    if (current.auth_user_id) {
      await supabaseAdmin
        .from("profiles")
        .update({
          full_name: data.fullName,
          phone: clean(data.phone),
          address: clean(data.address),
        })
        .eq("id", current.auth_user_id);

      await supabaseAdmin
        .from("user_role_assignments")
        .delete()
        .eq("user_id", current.auth_user_id)
        .eq("tenant_id", tenantId);
      await supabaseAdmin.from("user_role_assignments").insert({
        user_id: current.auth_user_id,
        tenant_id: tenantId,
        role_id: role.id,
      });
    }

    await writeAudit(supabaseAdmin, {
      tenantId,
      actorId: context.userId,
      action: "employee.updated",
      entityId: data.employeeId,
    });
    return { ok: true };
  });

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ employeeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const tenantId = await requirePermission(context, "employees:update");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return sendInvitation({
      admin: supabaseAdmin,
      tenantId,
      employeeId: data.employeeId,
      actorId: context.userId,
    });
  });

export const resendTeamMemberInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ employeeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const tenantId = await requirePermission(context, "employees:update");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("auth_user_id")
      .eq("id", data.employeeId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!employee) throw new Error("Mitarbeiter wurde nicht gefunden.");

    if (employee.auth_user_id) {
      const { data: authResult } = await supabaseAdmin.auth.admin.getUserById(
        employee.auth_user_id,
      );
      if (authResult.user?.email_confirmed_at || authResult.user?.last_sign_in_at) {
        throw new Error("Die Einladung wurde bereits angenommen.");
      }
      await supabaseAdmin
        .from("employee_invitations")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("employee_id", data.employeeId)
        .in("status", ["pending", "sent"]);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        employee.auth_user_id,
      );
      if (deleteError) throw new Error(deleteError.message);
    }

    return sendInvitation({
      admin: supabaseAdmin,
      tenantId,
      employeeId: data.employeeId,
      actorId: context.userId,
    });
  });

export const revokeTeamMemberInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ employeeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const tenantId = await requirePermission(context, "employees:update");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("auth_user_id")
      .eq("id", data.employeeId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!employee) throw new Error("Mitarbeiter wurde nicht gefunden.");

    if (employee.auth_user_id) {
      const { data: authResult } = await supabaseAdmin.auth.admin.getUserById(
        employee.auth_user_id,
      );
      if (authResult.user?.email_confirmed_at || authResult.user?.last_sign_in_at) {
        throw new Error("Angenommene Einladungen können nicht widerrufen werden.");
      }
    }

    await supabaseAdmin
      .from("employee_invitations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("employee_id", data.employeeId)
      .in("status", ["pending", "sent"]);

    if (employee.auth_user_id) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(employee.auth_user_id);
      if (error) throw new Error(error.message);
    }

    await writeAudit(supabaseAdmin, {
      tenantId,
      actorId: context.userId,
      action: "employee.invitation_revoked",
      entityId: data.employeeId,
    });
    return { ok: true };
  });

export const deactivateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ employeeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const tenantId = await requirePermission(context, "employees:deactivate");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("auth_user_id, role_id")
      .eq("id", data.employeeId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!employee) throw new Error("Mitarbeiter wurde nicht gefunden.");
    if (employee.auth_user_id === context.userId) {
      throw new Error("Du kannst deinen eigenen Zugang nicht sperren.");
    }

    const { data: ownerRole } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("key", "unternehmensinhaber")
      .maybeSingle();
    if (ownerRole?.id === employee.role_id) {
      const { count } = await supabaseAdmin
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("role_id", ownerRole.id)
        .eq("status", "active");
      if ((count ?? 0) <= 1) throw new Error("Der letzte Unternehmensinhaber kann nicht gesperrt werden.");
    }

    const now = new Date().toISOString();
    await supabaseAdmin
      .from("employees")
      .update({ status: "inactive", disabled_at: now, updated_at: now })
      .eq("id", data.employeeId);

    if (employee.auth_user_id) {
      await supabaseAdmin
        .from("profiles")
        .update({ disabled_at: now })
        .eq("id", employee.auth_user_id);
      await supabaseAdmin
        .from("tenant_memberships")
        .update({ status: "disabled", disabled_at: now })
        .eq("tenant_id", tenantId)
        .eq("user_id", employee.auth_user_id);
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
        employee.auth_user_id,
        { ban_duration: "876000h" },
      );
      if (banError) throw new Error(banError.message);
      await supabaseAdmin.rpc("revoke_user_sessions", { _user_id: employee.auth_user_id });
    }

    await writeAudit(supabaseAdmin, {
      tenantId,
      actorId: context.userId,
      action: "employee.deactivated",
      entityId: data.employeeId,
    });
    return { ok: true };
  });

export const reactivateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ employeeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const tenantId = await requirePermission(context, "employees:deactivate");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("auth_user_id")
      .eq("id", data.employeeId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!employee) throw new Error("Mitarbeiter wurde nicht gefunden.");

    await supabaseAdmin
      .from("employees")
      .update({ status: "active", disabled_at: null, updated_at: new Date().toISOString() })
      .eq("id", data.employeeId);

    if (employee.auth_user_id) {
      await supabaseAdmin
        .from("profiles")
        .update({ disabled_at: null })
        .eq("id", employee.auth_user_id);
      await supabaseAdmin
        .from("tenant_memberships")
        .update({ status: "active", disabled_at: null })
        .eq("tenant_id", tenantId)
        .eq("user_id", employee.auth_user_id);
      const { error } = await supabaseAdmin.auth.admin.updateUserById(employee.auth_user_id, {
        ban_duration: "none",
      });
      if (error) throw new Error(error.message);
    }

    await writeAudit(supabaseAdmin, {
      tenantId,
      actorId: context.userId,
      action: "employee.reactivated",
      entityId: data.employeeId,
    });
    return { ok: true };
  });

export const completeTeamInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { data: invitation, error } = await supabaseAdmin
      .from("employee_invitations")
      .update({ status: "accepted", accepted_at: now, updated_at: now })
      .eq("auth_user_id", context.userId)
      .in("status", ["pending", "sent"])
      .select("tenant_id, employee_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invitation) return { accepted: false };

    await supabaseAdmin
      .from("employees")
      .update({ status: "active", disabled_at: null, updated_at: now })
      .eq("id", invitation.employee_id);
    return { accepted: true, tenantId: invitation.tenant_id };
  });

export const listEmployeeDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("tenant_id, disabled_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.tenant_id || profile.disabled_at) throw new Error("Kein aktiver Betrieb gefunden.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("employees")
      .select("id, auth_user_id, full_name, subgroup")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "active")
      .is("disabled_at", null)
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyEmployeeRecord = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("employees")
      .select("*")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
