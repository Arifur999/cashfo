import { Info } from "lucide-react";

// Under a page's header for a member who can look but not change anything
// (neither the owner nor an accountant), so the missing buttons have a reason.
export function ReadOnlyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-small text-ink-muted">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
