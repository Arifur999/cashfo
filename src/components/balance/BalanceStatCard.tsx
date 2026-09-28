import type { LucideIcon } from "lucide-react";

interface BalanceStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  color?: string; // text-* color class for the value, defaults to neutral-900
  sub?: string; // optional caption line under the value
}

// Shared stat tile for the Balance section (Overview/Transfer/Ledger/Wallet) --
// mirrors DashboardPageClient's own StatCard / LoanDashboardPageClient's
// SummaryCard (both defined locally in their own files); promoted to a real
// shared component here since all four Balance pages are siblings in the
// same feature folder and would otherwise duplicate the identical markup.
export function BalanceStatCard({ icon: Icon, label, value, color, sub }: BalanceStatCardProps) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
      <div className="flex items-center gap-2 text-neutral-400">
        <Icon className="h-4 w-4" />
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className={`mt-2 text-xl font-bold tabular-nums ${color ?? "text-neutral-900"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}
