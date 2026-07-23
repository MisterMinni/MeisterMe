import { Link } from "@tanstack/react-router";

type PublicFooterProps = { compact?: boolean };

export function PublicFooter({ compact = false }: PublicFooterProps) {
  return (
    <footer className={compact ? "py-4" : "border-t border-border bg-white py-7"}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} MeisterMe</span>
        <Link to="/impressum" className="hover:text-foreground hover:underline">Impressum</Link>
        <Link to="/datenschutz" className="hover:text-foreground hover:underline">Datenschutz</Link>
        <Link to="/kontakt" className="hover:text-foreground hover:underline">Kontakt</Link>
      </div>
    </footer>
  );
}

