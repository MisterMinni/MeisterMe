import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";
import { PublicFooter } from "@/components/PublicFooter";

type LegalPageLayoutProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children: ReactNode;
};

export function LegalPageLayout({ title, subtitle, eyebrow = "Rechtliches", children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <Link to="/auth" className="text-sm font-semibold text-brand hover:underline">Zur Anmeldung</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mt-3 text-slate-600">{subtitle}</p>
        <article className="prose-legal mt-8 rounded-2xl border border-border bg-white p-6 shadow-card sm:p-9">
          {children}
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
