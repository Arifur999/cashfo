import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// A checkbox drawn over a hidden input (a challenge's daily items): the
// label carries the keyboard focus ring the hidden input can't show.
export const CHECK_FOCUS = "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring)";

interface CloseButtonProps {
  onClick: () => void;
  // Already translated.
  label: string;
  className?: string;
}

// The cross in a drawer's or dialog's header: 36px, 44px under a finger.
export function CloseButton({ onClick, label, className }: CloseButtonProps) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cn("flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11", className)}>
      <X className="size-4.5" aria-hidden="true" />
    </button>
  );
}

interface PanelFooterProps {
  // A ghost action on the left (Archive, Delete, Mark as finished). On a
  // phone it takes a row of its own under the buttons, so Save never runs
  // off the edge, whatever the language.
  aside?: React.ReactNode;
  // Cancel and the main button, kept together on the right.
  children: React.ReactNode;
  // A drawer: 16px in from the edge on phones, 24px from md up. A dialog
  // keeps 24px.
  drawer?: boolean;
  className?: string;
}

// The strip at the foot of a drawer or dialog.
export function PanelFooter({ aside, children, drawer = false, className }: PanelFooterProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 border-t border-line bg-strip", drawer ? "px-4 py-3 md:px-6 md:py-4" : "px-6 py-4", className)}>
      {aside && <div className="flex flex-wrap items-center gap-2 max-sm:order-last max-sm:w-full max-sm:justify-center">{aside}</div>}
      <div className="ml-auto flex items-center gap-3">{children}</div>
    </div>
  );
}
