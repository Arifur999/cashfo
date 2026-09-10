"use client";

import { Briefcase, Check, ChevronDown, Plus, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal";

export function WorkspaceSwitcher() {
  const { user, activeBusinessId, activeBusiness, switchWorkspace } = useAuth();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const personal = user.businesses.find((b) => b.type === "PERSONAL");
  const businesses = user.businesses.filter((b) => b.type === "BUSINESS");

  function select(businessId: string) {
    setOpen(false);
    if (businessId !== activeBusinessId) {
      switchWorkspace(businessId);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        {activeBusiness?.type === "BUSINESS" ? <Briefcase className="h-4 w-4 text-brand-primary" /> : <User className="h-4 w-4 text-brand-primary" />}
        {activeBusiness?.name ?? "Select workspace"}
        <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
      </button>

      {open && (
        <>
          <button type="button" aria-label="Close" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl bg-white p-2 shadow-lg shadow-black/10">
            {personal && (
              <div className="mb-1">
                <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">Personal</p>
                <WorkspaceItem business={personal} isActive={personal.id === activeBusinessId} onSelect={() => select(personal.id)} />
              </div>
            )}

            {businesses.length > 0 && (
              <div className="mb-1">
                <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">Business Workspaces</p>
                {businesses.map((b) => (
                  <WorkspaceItem key={b.id} business={b} isActive={b.id === activeBusinessId} onSelect={() => select(b.id)} />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCreateOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-brand-primary hover:bg-brand-primary/10"
            >
              <Plus className="h-4 w-4" /> New workspace
            </button>
          </div>
        </>
      )}

      <CreateWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function WorkspaceItem({
  business,
  isActive,
  onSelect,
}: {
  business: { id: string; name: string; type: string };
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm ${
        isActive ? "bg-brand-primary/10 text-brand-primary" : "text-neutral-700 hover:bg-neutral-50"
      }`}
    >
      <span className="flex items-center gap-2">
        {business.type === "BUSINESS" ? <Briefcase className="h-4 w-4" /> : <User className="h-4 w-4" />}
        {business.name}
      </span>
      {isActive && <Check className="h-4 w-4" />}
    </button>
  );
}
