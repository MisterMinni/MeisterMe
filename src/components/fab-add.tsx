import { Plus } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FabAddProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
};

/**
 * Floating "+" action button, centered at the bottom of the viewport.
 * Used across list pages instead of a top-right "New …" button.
 */
export const FabAdd = forwardRef<HTMLButtonElement, FabAddProps>(
  ({ label = "Neu anlegen", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          "fixed bottom-6 left-1/2 z-40 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg ring-4 ring-background transition hover:scale-105 hover:bg-brand/90 active:scale-95",
          className,
        )}
        {...props}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>
    );
  },
);
FabAdd.displayName = "FabAdd";
