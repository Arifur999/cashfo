import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldProps {
  // The control's id, so the label points at it.
  htmlFor: string;
  label: React.ReactNode;
  // Something beside the label, on the right ("Forgot password?").
  aside?: React.ReactNode;
  // Help under the control; the error replaces it.
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

// A label, its control, and the line under it. The error says how to fix
// the value, in the expense red, with an icon.
const Field = ({ htmlFor, label, aside, hint, error, className, children }: FieldProps) => (
  <div className={cn("flex min-w-0 flex-col gap-2", className)}>
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={htmlFor} className="text-small font-semibold text-ink-2">
        {label}
      </label>
      {aside}
    </div>
    {children}
    {error ? (
      <p id={`${htmlFor}-error`} role="alert" className="flex items-center gap-2 text-caption text-expense">
        <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
        {error}
      </p>
    ) : (
      hint && (
        <p id={`${htmlFor}-hint`} className="text-caption font-normal text-ink-muted">
          {hint}
        </p>
      )
    )}
  </div>
);

export default Field;
