import { DISPLAY_STACK } from "./fonts";

export function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <h2 className="text-xl font-semibold text-neutral-900" style={{ fontFamily: DISPLAY_STACK }}>
        {title}
      </h2>
      {count !== undefined && count > 0 && (
        <span className="rounded-full bg-slate-600/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700 dark:text-amber-300">{count}</span>
      )}
    </div>
  );
}
