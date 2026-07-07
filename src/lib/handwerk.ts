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

export const PROJECT_STATUS = [
  { value: "anfrage", label: "Anfrage" },
  { value: "angebot", label: "Angebot" },
  { value: "beauftragt", label: "Beauftragt" },
  { value: "geplant", label: "Geplant" },
  { value: "in_arbeit", label: "In Arbeit" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
  { value: "abgerechnet", label: "Abgerechnet" },
] as const;

export const OFFER_STATUS = [
  { value: "entwurf", label: "Entwurf" },
  { value: "gesendet", label: "Gesendet" },
  { value: "angenommen", label: "Angenommen" },
  { value: "abgelehnt", label: "Abgelehnt" },
] as const;

export const REPORT_STATUS = [
  { value: "entwurf", label: "Entwurf" },
  { value: "fertig", label: "Fertig" },
  { value: "geprueft", label: "Geprüft" },
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
        .select("*, tenants(name, gewerk_default)")
        .eq("id", u.user.id)
        .maybeSingle();
      return data;
    },
  });
}

export type AppRole = "admin" | "buero" | "bauleiter" | "monteur" | "azubi";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  buero: "Büro",
  bauleiter: "Bauleiter",
  monteur: "Monteur",
  azubi: "Azubi",
};

// Highest-privilege role wins for gate decisions
const ROLE_RANK: Record<AppRole, number> = { admin: 5, buero: 4, bauleiter: 3, monteur: 2, azubi: 1 };

export function useMyRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: async (): Promise<AppRole[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
}

export function useMyRole(): AppRole | null {
  const { data } = useMyRoles();
  if (!data || data.length === 0) return null;
  return [...data].sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0];
}

export function canAccess(role: AppRole | null, allowed: AppRole[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}
