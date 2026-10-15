import { cn } from "@/lib/utils";

interface VaultGateProps {
  children: React.ReactNode;
  className?: string;
}

// The dark stage the vault's locked forms stand on: the deep green wash
// with two faint rings behind.
export function VaultGate({ children, className }: VaultGateProps) {
  return (
    <div className={cn("relative flex flex-col items-start justify-center gap-6 overflow-hidden rounded-xl bg-[linear-gradient(160deg,var(--ink)_0%,var(--forest)_100%)] px-4 py-8 shadow-[0_10px_28px_-8px_rgba(11,61,46,0.18)] sm:px-12 sm:py-14 lg:flex-row", className)}>
      <span aria-hidden="true" className="absolute -bottom-50 -left-35 size-115 rounded-full border border-mint-200/10" />
      <span aria-hidden="true" className="absolute -top-35 -right-25 size-90 rounded-full border border-mint-200/10" />
      {children}
    </div>
  );
}

// The white card a form sits in.
export function GateCard({ children, className, ...props }: React.ComponentProps<"section">) {
  return (
    <section className={cn("relative flex w-full max-w-115 flex-col gap-4 rounded-xl border border-line bg-surface px-5 py-6 shadow-[0_10px_28px_-8px_rgba(11,61,46,0.18),0_2px_6px_rgba(14,26,22,0.06)] sm:px-8", className)} {...props}>
      {children}
    </section>
  );
}

// The side note beside a form.
export function GateAside({ children, className, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside className={cn("relative flex w-full max-w-85 flex-col gap-4 rounded-xl border border-line bg-surface p-6", className)} {...props}>
      {children}
    </aside>
  );
}
