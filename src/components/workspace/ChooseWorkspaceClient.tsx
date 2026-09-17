"use client";

import { Briefcase, Loader2, Lock, Plus, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";
import { PinPromptModal } from "@/components/workspace/PinPromptModal";
import type { CurrentUser, UserBusiness, WorkspaceListItem } from "@/lib/api";
import { switchWorkspaceAction } from "@/lib/businessActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface ChooseWorkspaceClientProps {
  user: CurrentUser;
}

// null means no trial at all (trialEndsAt was null, caller never invokes
// this). A non-null trialEndsAt in the past renders as "Trial expired"
// rather than a negative day count. Takes `t` as a param since this is a
// plain function outside the component body, where the useLocale() hook
// isn't callable.
function trialLabel(trialEndsAt: string, t: (key: string) => string): { text: string; expired: boolean } {
  const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000);
  if (daysLeft <= 0) return { text: t("Trial expired"), expired: true };
  const unit = daysLeft === 1 ? t("day") : t("days");
  return { text: `${t("Trial")} — ${daysLeft} ${unit} ${t("left")}`, expired: false };
}

// Full-page "Choose your Workspace" screen (modeled on the Hishabee
// reference) -- rendered by app/choose-workspace/page.tsx for any user with
// more than one workspace, every time they log in. Deliberately does NOT use
// useAuth()/AuthProvider: this page sits outside the (dashboard) route group
// that seeds that context, and it only ever needs the plain user prop its
// Server Component parent already fetched.
export function ChooseWorkspaceClient({ user }: ChooseWorkspaceClientProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  // Which card's button should show its own spinner -- useTransition only
  // gives one shared isPending flag, so this narrows it to the one card the
  // user actually clicked (or the newly-created workspace, for the Add New
  // Workspace flow).
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [pinBusiness, setPinBusiness] = useState<UserBusiness | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  function proceed(businessId: string) {
    setSelectingId(businessId);
    startTransition(async () => {
      await switchWorkspaceAction(businessId);
      router.push("/dashboard");
    });
  }

  function handleSelect(business: UserBusiness) {
    if (business.hasPinLock) {
      setPinBusiness(business);
      return;
    }
    proceed(business.id);
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-brand-content px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <div className="text-lg font-semibold tracking-wide text-brand-dark">Money Tracker</div>
          <h1 className="mt-4 text-2xl font-semibold text-neutral-900">{t("Choose your Workspace")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("Select which workspace to open, or add a new one")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {user.businesses.map((business) => {
            const Icon = business.type === "BUSINESS" ? Briefcase : User;
            const displayName = business.isDefault ? user.name : business.name;
            const subtitle = business.type === "BUSINESS" ? t("Business Workspace") : t("Personal Workspace");
            const trial = business.trialEndsAt ? trialLabel(business.trialEndsAt, t) : null;
            const isSelecting = isPending && selectingId === business.id;

            return (
              <div key={business.id} className="flex flex-col items-center rounded-2xl bg-surface p-6 text-center shadow-sm shadow-black/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-3 flex items-center gap-1.5 font-medium text-neutral-900">
                  {displayName}
                  {business.hasPinLock && <Lock className="h-3.5 w-3.5 text-neutral-400" />}
                </p>
                <p className="text-sm text-neutral-500">{subtitle}</p>
                {trial && (
                  <span
                    className={`mt-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                      trial.expired ? "bg-brand-danger/10 text-brand-danger" : "bg-brand-primary/10 text-brand-primary"
                    }`}
                  >
                    {trial.text}
                  </span>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSelect(business)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-primary-hover disabled:opacity-60"
                >
                  {isSelecting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("Select")}
                </button>
              </div>
            );
          })}

          <button
            type="button"
            disabled={isPending}
            onClick={() => setCreateOpen(true)}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 p-6 text-center text-neutral-500 transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-60"
          >
            <Plus className="h-6 w-6" />
            <p className="mt-2 text-sm font-medium">{t("Add New Workspace")}</p>
          </button>
        </div>
      </div>

      {pinBusiness && (
        <PinPromptModal
          open
          onClose={() => setPinBusiness(null)}
          businessId={pinBusiness.id}
          businessName={pinBusiness.isDefault ? user.name : pinBusiness.name}
          onVerified={() => proceed(pinBusiness.id)}
        />
      )}

      <CreateWorkspaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created: WorkspaceListItem) => proceed(created.id)}
      />
    </div>
  );
}
