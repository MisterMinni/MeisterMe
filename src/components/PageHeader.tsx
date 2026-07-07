import { Link } from "@tanstack/react-router";
import { Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  );
}

export function ComingSoon({
  title,
  desc,
  icon: Icon,
  bullets,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  desc: string;
  icon: LucideIcon;
  bullets?: string[];
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-3xl border-2 border-dashed border-border bg-card p-8 shadow-card sm:p-12">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Icon className="h-7 w-7" />
          </span>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand">
              <Sparkles className="h-3 w-3" /> Bald verfügbar
            </div>
            <h2 className="font-display text-2xl font-bold">{title}</h2>
          </div>
        </div>
        <p className="mt-4 text-muted-foreground">{desc}</p>
        {bullets && bullets.length > 0 && (
          <ul className="mt-6 space-y-2">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" /> {b}
              </li>
            ))}
          </ul>
        )}
        {ctaLabel && ctaHref && (
          <Button asChild className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to={ctaHref as never}>{ctaLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card py-16 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{desc}</p>
      {action}
    </div>
  );
}
