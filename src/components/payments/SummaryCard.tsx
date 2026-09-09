import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: { value: number; label: string } | null;
}

export function SummaryCard({ icon: Icon, label, value, trend }: SummaryCardProps) {
  const isPositive = (trend?.value ?? 0) >= 0;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex items-center gap-2 text-neutral-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
      {trend && (
        <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", isPositive ? "text-brand-primary" : "text-brand-danger")}>
          {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {Math.abs(trend.value).toFixed(1)}% {trend.label}
        </p>
      )}
    </div>
  );
}
