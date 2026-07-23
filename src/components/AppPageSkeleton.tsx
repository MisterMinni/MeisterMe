import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type SkeletonKind =
  | "dashboard"
  | "office"
  | "workflow"
  | "documents"
  | "catalog"
  | "planner"
  | "time"
  | "chat"
  | "media"
  | "profile"
  | "form"
  | "list";

export function AppPageSkeleton({ pathname }: { pathname: string }) {
  const kind = getSkeletonKind(pathname);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Seite wird geladen"
      className="min-h-[calc(100vh-10rem)]"
    >
      <span className="sr-only">Inhalte werden geladen.</span>
      <div aria-hidden="true">{renderSkeleton(kind)}</div>
    </div>
  );
}

function getSkeletonKind(pathname: string): SkeletonKind {
  if (pathname === "/app" || pathname === "/app/") return "dashboard";
  if (pathname.startsWith("/app/buero/auftrag/")) return "workflow";
  if (pathname === "/app/buero/belege") return "documents";
  if (pathname === "/app/buero/stammdaten") return "catalog";
  if (pathname === "/app/buero" || pathname === "/app/buero/") return "office";
  if (/^\/app\/kunden\//.test(pathname)) return "profile";
  if (/^\/app\/baustellen\/[^/]+\/medien$/.test(pathname)) return "media";
  if (/^\/app\/baustellen\/[^/]+$/.test(pathname)) return "chat";
  if (/^\/app\/baustellen\/[^/]+\/(info|aufgaben)$/.test(pathname)) return "form";
  if (pathname === "/app/plan") return "planner";
  if (pathname === "/app/zeiten") return "time";
  if (pathname === "/app/ki-assistent") return "chat";
  if (pathname === "/app/profil" || pathname === "/app/profil/") return "profile";
  if (pathname === "/app/profil/daten" || pathname === "/app/einstellungen") return "form";
  if (pathname === "/app/profil/dokumente" || pathname === "/app/geraete") return "documents";
  return "list";
}

function renderSkeleton(kind: SkeletonKind) {
  switch (kind) {
    case "dashboard":
      return <DashboardSkeleton />;
    case "office":
      return <OfficeSkeleton />;
    case "workflow":
      return <WorkflowSkeleton />;
    case "documents":
      return <DocumentsSkeleton />;
    case "catalog":
      return <CatalogSkeleton />;
    case "planner":
      return <PlannerSkeleton />;
    case "time":
      return <TimeSkeleton />;
    case "chat":
      return <ChatSkeleton />;
    case "media":
      return <MediaSkeleton />;
    case "profile":
      return <ProfileSkeleton />;
    case "form":
      return <FormSkeleton />;
    default:
      return <ListSkeleton />;
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-72 max-w-[70vw]" />
        </div>
        <Skeleton className="hidden h-11 w-36 rounded-xl sm:block" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <MetricSkeleton key={`dashboard-metric-${index}`} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={`dashboard-module-${index}`} className="shadow-card">
            <CardContent className="flex items-start gap-4 p-5">
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-3 pt-1">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function OfficeSkeleton() {
  return (
    <div className="space-y-6">
      <PageIntroSkeleton />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <MetricSkeleton key={`office-metric-${index}`} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={`office-link-${index}`}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <ListCardSkeleton rows={3} />
    </div>
  );
}

function WorkflowSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row">
            <div className="space-y-3">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-8 w-64 max-w-[70vw]" />
              <Skeleton className="h-4 w-80 max-w-[80vw]" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28 rounded-md" />
              <Skeleton className="h-10 w-36 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <MetricSkeleton key={`workflow-metric-${index}`} compact />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={`workflow-step-${index}`} className="h-16 rounded-xl" />
          ))}
        </CardContent>
      </Card>
      {Array.from({ length: 3 }, (_, index) => (
        <section key={`workflow-section-${index}`} className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-96 max-w-full" />
            </div>
          </div>
          <ListCardSkeleton rows={index === 0 ? 2 : 3} />
        </section>
      ))}
    </div>
  );
}

function DocumentsSkeleton() {
  return (
    <div className="space-y-6">
      <PageIntroSkeleton />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <MetricSkeleton key={`document-metric-${index}`} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ListCardSkeleton rows={4} />
        <ListCardSkeleton rows={4} />
      </div>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-6">
      <PageIntroSkeleton />
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={`catalog-info-${index}`}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </CardContent>
          </Card>
        ))}
      </div>
      <ListCardSkeleton rows={5} />
    </div>
  );
}

function PlannerSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-[7rem_repeat(5,minmax(7rem,1fr))] gap-px bg-border">
            {Array.from({ length: 30 }, (_, index) => (
              <Skeleton key={`planner-cell-${index}`} className="h-20 rounded-none bg-card" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TimeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-5 rounded-3xl bg-navy p-6">
        <Skeleton className="mx-auto h-3 w-16 bg-white/15" />
        <Skeleton className="mx-auto h-14 w-64 max-w-[80vw] bg-white/15" />
        <div className="mx-auto grid w-full max-w-lg gap-2">
          <Skeleton className="h-12 bg-white/15" />
          <Skeleton className="h-12 bg-white/15" />
          <Skeleton className="h-12 bg-white/20" />
        </div>
      </div>
      <ListCardSkeleton rows={5} />
    </div>
  );
}

function ChatSkeleton() {
  return (
    <Card className="min-h-[calc(100vh-11rem)] overflow-hidden">
      <CardContent className="flex min-h-[calc(100vh-11rem)] flex-col p-4 sm:p-6">
        <div className="flex-1 space-y-5 py-4">
          <div className="flex gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <Skeleton className="h-20 w-[68%] rounded-2xl" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-14 w-[58%] rounded-2xl" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <Skeleton className="h-28 w-[74%] rounded-2xl" />
          </div>
        </div>
        <Skeleton className="h-14 w-full rounded-2xl" />
      </CardContent>
    </Card>
  );
}

function MediaSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {Array.from({ length: 15 }, (_, index) => (
          <Skeleton key={`media-${index}`} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row">
          <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
          <div className="w-full space-y-3 text-center sm:text-left">
            <Skeleton className="mx-auto h-7 w-48 sm:mx-0" />
            <Skeleton className="mx-auto h-4 w-64 max-w-full sm:mx-0" />
            <div className="flex justify-center gap-2 sm:justify-start">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <ListCardSkeleton rows={3} />
        <ListCardSkeleton rows={3} />
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageIntroSkeleton />
      <Card>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={`form-field-${index}`} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-11 w-32 rounded-md sm:col-span-2" />
        </CardContent>
      </Card>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <PageIntroSkeleton compact />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
      <ListCardSkeleton rows={6} />
    </div>
  );
}

function PageIntroSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className={compact ? "h-7 w-48" : "h-8 w-64 max-w-[75vw]"} />
      <Skeleton className="h-4 w-[32rem] max-w-[85vw]" />
    </div>
  );
}

function MetricSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card>
      <CardContent className={compact ? "space-y-2 p-3" : "space-y-3 p-4"}>
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className={compact ? "h-3 w-20" : "h-3 w-24"} />
        <Skeleton className={compact ? "h-6 w-24" : "h-7 w-28"} />
      </CardContent>
    </Card>
  );
}

function ListCardSkeleton({ rows }: { rows: number }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border">
        <div className="space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-64 max-w-[60vw]" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {Array.from({ length: rows }, (_, index) => (
          <div key={`list-row-${index}`} className="flex items-center gap-4 p-4 sm:p-5">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="hidden h-7 w-20 rounded-full sm:block" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
