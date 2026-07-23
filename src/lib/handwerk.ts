import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const GEWERKE = [
  { value: "stuckateur", label: "Stuckateur" },
  { value: "maler", label: "Maler" },
  { value: "trockenbauer", label: "Trockenbau" },
  { value: "dachdecker", label: "Dachdecker" },
  { value: "schreiner", label: "Schreiner" },
  { value: "shk", label: "SHK" },
  { value: "elektriker", label: "Elektriker" },
  { value: "galabau", label: "GaLaBau" },
  { value: "ausbau", label: "Ausbau/Bau" },
  { value: "sonstige", label: "Sonstige" },
] as const;

export const SITE_STATUS = [
  { value: "geplant", label: "Geplant" },
  { value: "in_arbeit", label: "In Bearbeitung" },
  { value: "abgeschlossen", label: "Fertig" },
  { value: "archiviert", label: "Archiviert" },
] as const;

export function formatEur(n: number | null | undefined) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number(n ?? 0));
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("de-DE").format(new Date(d));
}

export function useSession() {
  return useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*, tenants(name, gewerk_default, adresse, plz, ort, telefon, email, ustid, logo_url)")
        .eq("id", u.user.id)
        .maybeSingle();
      return data;
    },
  });
}

// Roles are now free-form (tenant-defined). We ship 7 defaults per tenant.
export type AppRole =
  | "unternehmensinhaber"
  | "administrator"
  | "personalverwaltung"
  | "buchhaltung"
  | "bauleiter"
  | "vorarbeiter"
  | "mitarbeiter"
  | (string & {});

export const ROLE_LABELS: Record<string, string> = {
  unternehmensinhaber: "Unternehmensinhaber",
  administrator: "Administrator",
  personalverwaltung: "Personalverwaltung",
  buchhaltung: "Buchhaltung",
  bauleiter: "Bauleiter",
  vorarbeiter: "Vorarbeiter",
  mitarbeiter: "Mitarbeiter",
};

const ROLE_RANK: Record<string, number> = {
  unternehmensinhaber: 100,
  administrator: 90,
  personalverwaltung: 60,
  buchhaltung: 50,
  bauleiter: 40,
  vorarbeiter: 30,
  mitarbeiter: 20,
};

export function useMyRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: async (): Promise<{ key: string; name: string }[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("user_role_assignments")
        .select("roles(key, name)")
        .eq("user_id", u.user.id);
      return (data ?? [])
        .map((r) => (r as unknown as { roles: { key: string; name: string } | null }).roles)
        .filter((r): r is { key: string; name: string } => !!r);
    },
  });
}

export function useMyRole(): AppRole | null {
  const { data } = useMyRoles();
  if (!data || data.length === 0) return null;
  return [...data].sort(
    (a, b) => (ROLE_RANK[b.key] ?? 0) - (ROLE_RANK[a.key] ?? 0),
  )[0].key as AppRole;
}

export function useMyPermissions() {
  return useQuery({
    queryKey: ["my-permissions"],
    queryFn: async (): Promise<string[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("user_role_assignments")
        .select("roles(role_permissions(permission_key))")
        .eq("user_id", u.user.id);
      const keys = new Set<string>();
      for (const row of data ?? []) {
        const roles = (row as unknown as { roles: { role_permissions: { permission_key: string }[] } | null }).roles;
        for (const rp of roles?.role_permissions ?? []) keys.add(rp.permission_key);
      }
      return Array.from(keys);
    },
  });
}

export function useHasPermission(perm: string): boolean {
  const { data } = useMyPermissions();
  return !!data?.includes(perm);
}

// Convenience: highest-tier "admin" (can manage roles and settings)
export function useIsAdmin(): boolean {
  const role = useMyRole();
  return role === "unternehmensinhaber" || role === "administrator";
}
