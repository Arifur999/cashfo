import { Info } from "lucide-react";
import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  tooltip?: string;
  children: ReactNode;
}

export function SectionCard({ title, tooltip, children }: SectionCardProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
      <div className="mb-4 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        {tooltip && (
          <span title={tooltip} className="cursor-help text-neutral-400">
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
