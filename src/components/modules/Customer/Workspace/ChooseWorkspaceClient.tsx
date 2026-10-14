"use client";

import { ArrowRight, Briefcase, Check, Lock, LogOut, Plus, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logoutAction } from "@/app/-actions/authActions";
import { CreateWorkspaceModal } from "@/components/modules/Customer/Workspace/CreateWorkspaceModal";
import { PinPromptModal } from "@/components/modules/Customer/Workspace/PinPromptModal";
import Loader from "@/components/shared/Loader";
import Avatar from "@/components/smartly/Avatar";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import Logo from "@/components/smartly/Logo";
import type { CurrentUser, UserBusiness, WorkspaceListItem } from "@/lib/customer/api";
import { switchWorkspaceAction } from "@/lib/customer/businessActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface ChooseWorkspaceClientProps {
  user: CurrentUser;
}

// null means no trial at all (trialEndsAt was null, caller never invokes
// this). A non-null trialEndsAt in the past renders as "Trial expired"
// rather than a negative day count.
function trialLabel(trialEndsAt: string, t: (key: string) => string): { text: string; expired: boolean } {
  const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000);
  if (daysLeft <= 0) return { text: t("Trial expired"), expired: true };
  const unit = daysLeft === 1 ? t("day") : t("days");
  return { text: `${t("Trial")} — ${daysLeft} ${unit} ${t("left")}`, expired: false };
}

const ROLE_LABEL: Record<UserBusiness["role"], string> = { OWNER: "Owner", ACCOUNTANT: "Accountant", STAFF: "Staff" };

// "Which workspace?" -- rendered by app/choose-workspace/page.tsx for any
// user with more than one workspace, every time they log in. Pick a card,
// then Open; a PIN-locked one asks for its PIN first. Deliberately does NOT
// use useAuth()/AuthProvider: this page sits outside the customer shell.
export function ChooseWorkspaceClient({ user }: ChooseWorkspaceClientProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  // GROUP workspaces aren't part of the "active workspace" concept (see
  // lib/activeBusiness.ts); they live at /group-expenses/[businessId].
  const workspaces = user.businesses.filter((business) => business.type !== "GROUP");
  const [selectedId, setSelectedId] = useState<string | null>(workspaces.find((b) => b.isDefault)?.id ?? workspaces[0]?.id ?? null);
  const [pinBusiness, setPinBusiness] = useState<UserBusiness | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const selected = workspaces.find((b) => b.id === selectedId);

  function proceed(businessId: string) {
    startTransition(async () => {
      await switchWorkspaceAction(businessId);
      router.push("/dashboard");
    });
  }

  function open() {
    if (!selected) return;
    if (selected.hasPinLock) {
      setPinBusiness(selected);
      return;
    }
    proceed(selected.id);
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-fresh px-6 py-6 md:px-12 md:py-8">
      <div className="flex w-full items-center justify-between gap-4">
        <Logo height={40} />
        <span className="flex items-center gap-3 text-body text-ink-2">
          <Avatar name={user.name} src={user.avatarUrl} size={36} />
          <span className="hidden flex-col sm:flex">
            <b>{user.name}</b>
            <span className="text-caption font-normal text-ink-muted">{user.email}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={() => startTransition(() => logoutAction())}>
            <LogOut />
            {t("Sign out")}
          </Button>
        </span>
      </div>

      <div className="mt-12 flex flex-col items-center gap-2 text-center md:mt-18">
        <h1 className="text-h1 text-ink md:text-display">{t("Which workspace?")}</h1>
        <p className="max-w-2xl text-body-lg text-ink-muted">{t("Each workspace keeps its own money and books. You can come back here any time from your name at the top right.")}</p>
      </div>

      <div className="mt-10 grid w-full max-w-[880px] grid-cols-1 justify-center gap-5 sm:grid-cols-[repeat(auto-fit,280px)]">
        {workspaces.map((business) => {
          const isBusiness = business.type === "BUSINESS";
          const on = business.id === selectedId;
          const displayName = business.isDefault ? user.name : business.name;
          const trial = business.trialEndsAt ? trialLabel(business.trialEndsAt, t) : null;
          return (
            <button
              key={business.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setSelectedId(business.id)}
              onDoubleClick={open}
              className={cn(
                "flex flex-col gap-4 rounded-lg bg-surface p-5 text-left text-ink transition-[border-color,box-shadow]",
                on ? "border-2 border-emerald shadow-[0_0_0_4px_var(--mint-50)]" : "border border-line shadow-card hover:border-line-strong",
              )}
            >
              <div className="flex items-center justify-between">
                <IconTile tone={isBusiness ? "loans" : "money"} size={44} className="rounded-md">
                  {isBusiness ? <Briefcase /> : <User />}
                </IconTile>
                <span className="flex items-center gap-3">
                  {business.hasPinLock && (
                    <span title={t("PIN lock")} className="flex items-center gap-1 text-caption font-semibold text-ink-muted">
                      <Lock className="size-3.5" aria-hidden="true" />
                      {t("PIN")}
                    </span>
                  )}
                  {on ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-emerald text-white">
                      <Check className="size-[15px]" strokeWidth={3} aria-hidden="true" />
                    </span>
                  ) : (
                    <span className="size-5.5 rounded-full border-[1.5px] border-line-strong" />
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  <b className="text-h3 font-bold">{displayName}</b>
                  {business.isDefault && (
                    <Chip tone="mint" className="font-semibold">
                      {t("Default")}
                    </Chip>
                  )}
                </span>
                <span className="text-small text-ink-muted">{t(isBusiness ? "Business workspace" : "Personal workspace")}</span>
              </div>
              <div className="flex flex-col gap-0.5 border-t border-surface-sunken pt-4">
                <span className={cn("text-title font-bold", trial?.expired && "text-expense")}>{trial ? trial.text : t(ROLE_LABEL[business.role])}</span>
                <span className="text-caption font-normal text-ink-muted">{business.currency}</span>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          disabled={isPending}
          onClick={() => setCreateOpen(true)}
          className="flex flex-col items-center justify-center gap-3 rounded-lg border-[1.5px] border-dashed border-line-strong p-5 text-center text-ink-2 transition-colors hover:border-emerald disabled:opacity-60"
        >
          <IconTile tone="money" size={44} className="rounded-md">
            <Plus />
          </IconTile>
          <b className="text-title font-bold text-ink">{t("New workspace")}</b>
          <span className="text-small text-ink-muted">{t("A personal or business workspace. Each keeps its own books.")}</span>
        </button>
      </div>

      <p className="mt-5 text-small text-ink-muted">
        {t("Mess and family groups open from")} <b className="text-ink-2">{t("Group expenses")}</b> {t("inside any workspace.")}
      </p>

      <div className="mt-10">
        <Button size="xl" className="px-5" disabled={!selected || isPending} onClick={open}>
          {isPending ? <Loader size={18} onDark label={t("Loading...")} /> : null}
          {t("Open")}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>

      {pinBusiness && (
        <PinPromptModal
          open
          onClose={() => setPinBusiness(null)}
          businessId={pinBusiness.id}
          businessName={pinBusiness.isDefault ? user.name : pinBusiness.name}
          isOwner={pinBusiness.role === "OWNER"}
          onVerified={() => proceed(pinBusiness.id)}
        />
      )}

      <CreateWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(created: WorkspaceListItem) => proceed(created.id)} />
    </div>
  );
}
