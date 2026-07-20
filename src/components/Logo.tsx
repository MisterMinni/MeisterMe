import { Link } from "@tanstack/react-router";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const textColor = variant === "light" ? "text-white" : "text-primary";
  return (
    <Link to="/" className="flex items-center gap-2">
      <img
        src="/app-icon.svg"
        alt=""
        aria-hidden="true"
        className="h-9 w-9 rounded-xl shadow-card"
      />
      <span className={`font-display text-lg font-bold tracking-tight ${textColor}`}>
        MeisterMe
      </span>
    </Link>
  );
}
