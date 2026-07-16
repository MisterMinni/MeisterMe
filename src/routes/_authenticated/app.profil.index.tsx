import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type ComponentType } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useProfile,
  useSession,
  useIsAdmin,
} from "@/lib/handwerk";
import { useAvatarUrl } from "@/lib/avatar";
import {
  ChevronRight,
  UserRound,
  FileText,
  Palmtree,
  Settings,
  LogOut,
  Camera,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/profil/")({
  head: () => ({ meta: [{ title: "Mein Profil – MeisterMe" }] }),
  component: Profil,
});

function Profil() {
  const { data: profile } = useProfile();
  const { data: session } = useSession();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const email = session?.user?.email ?? "";
  const userId = session?.user?.id ?? "";
  const displayName = profile?.full_name?.trim() || email || "Konto";
  const initials =
    (profile?.full_name?.trim()
      ? profile.full_name.trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("")
      : email.slice(0, 2)
    ).toUpperCase() || "?";

  const { data: avatarUrl } = useAvatarUrl(profile?.avatar_url ?? null);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Abgemeldet");
    navigate({ to: "/auth" });
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte ein Bild wählen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild ist zu groß (max. 5 MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", userId);
      if (updErr) throw updErr;
      // best-effort cleanup of prior avatar
      if (profile?.avatar_url && profile.avatar_url !== path) {
        await supabase.storage.from("avatars").remove([profile.avatar_url]);
      }
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["avatar-url"] });
      toast.success("Profilbild aktualisiert");
    } catch (err: any) {
      toast.error(err.message ?? "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl flex-col">
      <section className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-6 text-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-brand text-3xl font-bold text-brand-foreground shadow-md ring-4 ring-brand/10 transition hover:ring-brand/20"
          aria-label="Profilbild ändern"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </span>
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-brand text-brand-foreground shadow">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickFile}
        />
        <h2 className="mt-2 font-display text-2xl font-semibold">{displayName}</h2>
        <p className="text-sm text-muted-foreground">{email}</p>
        {profile?.tenants?.name && (
          <span className="mt-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {profile.tenants.name}
          </span>
        )}
      </section>

      <div className="space-y-2 px-1">
        <ProfileTile
          icon={UserRound}
          label="Persönliche Daten"
          subtitle="Kontakt, Anschrift, Vertrag"
          to="/app/profil/daten"
        />
        <ProfileTile
          icon={FileText}
          label="Dokumente"
          subtitle="Vertrag, Lohnabrechnungen"
          to="/app/profil/dokumente"
        />
        <ProfileTile
          icon={Palmtree}
          label="Urlaub & Abwesenheiten"
          subtitle="Anträge & Übersicht"
          to="/app/abwesenheiten"
        />
        {isAdmin && (
          <ProfileTile
            icon={Settings}
            label="Einstellungen"
            subtitle="Betrieb & Rollen"
            to="/app/einstellungen"
          />
        )}
      </div>

      <button
        onClick={signOut}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-4 text-sm font-semibold text-foreground shadow-card transition hover:bg-secondary"
      >
        <LogOut className="h-4 w-4" />
        Abmelden
      </button>
    </div>
  );
}

function ProfileTile({
  icon: Icon,
  label,
  subtitle,
  to,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  subtitle?: string;
  to?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-card transition hover:bg-secondary/60">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        {subtitle && (
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
  if (to) return <Link to={to as never}>{inner}</Link>;
  return (
    <button type="button" onClick={onClick} className="block w-full">
      {inner}
    </button>
  );
}
