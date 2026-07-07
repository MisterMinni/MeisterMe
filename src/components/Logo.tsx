import { Link } from "@tanstack/react-router";
import { HardHat } from "lucide-react";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const textColor = variant === "light" ? "text-white" : "text-primary";
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-card">
        <HardHat className="h-5 w-5" />
      </span>
      <span className={`font-display text-lg font-bold tracking-tight ${textColor}`}>
        MeisterMe
      </span>
    </Link>
  );
}
