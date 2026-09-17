"use client";

import { Briefcase, Check, ChevronDown, Lock, Plus, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import type { UserBusiness } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal";
import { PinPromptModal } from "./PinPromptModal";

export function WorkspaceSwitcher() {
  const { user, activeBusinessId, activeBusiness, switchWorkspace } = useAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [pinPromptFor, setPinPromptFor] = useState<{ id: string; name: string } | null>(null);

  const personal = user.businesses.find((b) => b.type === "PERSONAL");
  const businesses = user.businesses.filter((b) => b.type === "BUSINESS");

  // The default (PERSONAL) workspace's own `name` is literally "Personal" in
  // the database (set at registration, never user-edited) -- the product
  // wants the account holder's own name shown for it everywhere instead,
  // without touching the underlying Business.name field itself.
  const displayName = (b: UserBusiness) => (b.isDefault ? user.name : b.name);

  function select(business: UserBusiness) {
    setOpen(false);
    if (business.id === activeBusinessId) return;
    if (business.hasPinLock) {
      setPinPromptFor({ id: business.id, name: displayName(business) });
      return;
    }
    switchWorkspace(business.id);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        {activeBusiness?.type === "BUSINESS" ? <Briefcase className="h-4 w-4 text-brand-primary" /> : <User className="h-4 w-4 text-brand-primary" />}
        {activeBusiness ? displayName(activeBusiness) : t("Select workspace")}
        <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
      </button>

      {open && (
        <>
          <button type="button" aria-label="Close" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl bg-surface p-2 shadow-lg shadow-black/10">
            {personal && (
              <div className="mb-1">
                <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">{t("Personal")}</p>
                <WorkspaceItem
                  business={personal}
                  displayName={displayName(personal)}
                  isActive={personal.id === activeBusinessId}
                  onSelect={() => select(personal)}
                />
              </div>
            )}

            {businesses.length > 0 && (
              <div className="mb-1">
                <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">{t("Business Workspaces")}</p>
                {businesses.map((b) => (
                  <WorkspaceItem
                    key={b.id}
                    business={b}
                    displayName={displayName(b)}
                    isActive={b.id === activeBusinessId}
                    onSelect={() => select(b)}
                  />
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
              <Plus className="h-4 w-4" /> {t("New workspace")}
            </button>
          </div>
        </>
      )}

      <CreateWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <PinPromptModal
        open={pinPromptFor !== null}
        businessId={pinPromptFor?.id ?? ""}
        businessName={pinPromptFor?.name ?? ""}
        onClose={() => setPinPromptFor(null)}
        onVerified={() => {
          if (pinPromptFor) switchWorkspace(pinPromptFor.id);
          setPinPromptFor(null);
        }}
      />
    </div>
  );
}

function WorkspaceItem({
  business,
  displayName,
  isActive,
  onSelect,
}: {
  business: UserBusiness;
  displayName: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { t } = useLocale();
  const trialActive = business.trialEndsAt ? new Date(business.trialEndsAt) > new Date() : null;
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
        {displayName}
        {business.hasPinLock && !isActive && <Lock className="h-3 w-3" />}
        {business.trialEndsAt && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              trialActive ? "bg-amber-100 text-amber-700" : "bg-brand-danger/10 text-brand-danger"
            }`}
          >
            {trialActive ? t("Trial") : t("Trial expired")}
          </span>
        )}
      </span>
      {isActive && <Check className="h-4 w-4" />}
    </button>
  );
}
