"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SavingsGoalStatus } from "@/lib/api";

interface GoalActionsMenuProps {
  status: SavingsGoalStatus;
  onViewDetails: () => void;
  onEdit: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
}

// Small self-contained dropdown ("..." button) -- same outside-click-to-
// close pattern as Combobox, scoped to just this one menu instance.
export function GoalActionsMenu({ status, onViewDetails, onEdit, onTogglePause, onDelete }: GoalActionsMenuProps) {
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
        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-neutral-100 bg-surface py-1 shadow-xl shadow-black/10">
          <button type="button" onClick={() => run(onViewDetails)} className="block w-full px-3.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">
            View Details
          </button>
          <button type="button" onClick={() => run(onEdit)} className="block w-full px-3.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">
            Edit Goal
          </button>
          {status !== "COMPLETED" && (
            <button type="button" onClick={() => run(onTogglePause)} className="block w-full px-3.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">
              {status === "PAUSED" ? "Resume Goal" : "Pause Goal"}
            </button>
          )}
          <button type="button" onClick={() => run(onDelete)} className="block w-full px-3.5 py-2 text-left text-sm text-brand-danger hover:bg-neutral-50">
            Delete Goal
          </button>
        </div>
      )}
    </div>
  );
}
