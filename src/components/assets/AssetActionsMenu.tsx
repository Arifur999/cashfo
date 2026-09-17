"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AssetActionsMenuProps {
  onViewDetails: () => void;
}

// Small self-contained dropdown ("..." button) -- same outside-click-to-
// close pattern as GoalActionsMenu (Savings Goals' own "..." menu). Just
// one item for now (View Details); built as its own menu component rather
// than a second plain button so more asset-level actions can land here
// later without reshuffling the row layout again.
export function AssetActionsMenu({ onViewDetails }: AssetActionsMenuProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function run(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        className="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-50"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-neutral-100 bg-surface py-1 shadow-xl shadow-black/10">
          <button type="button" onClick={() => run(onViewDetails)} className="block w-full px-3.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">
            {t("View Details")}
          </button>
        </div>
      )}
    </div>
  );
}
