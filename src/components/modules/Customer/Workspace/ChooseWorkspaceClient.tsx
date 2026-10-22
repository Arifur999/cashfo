"use client";

import { ArrowRight, Check, Lock, LogOut, Plus, Store, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { logoutAction } from "@/app/-actions/authActions";
import { CreateWorkspaceModal } from "@/components/modules/Customer/Workspace/CreateWorkspaceModal";
import { PinPromptModal } from "@/components/modules/Customer/Workspace/PinPromptModal";
import { useReturnFocus } from "@/components/modules/Customer/Workspace/useReturnFocus";
import Loader from "@/components/shared/Loader";
import Avatar from "@/components/smartly/Avatar";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import Logo from "@/components/smartly/Logo";
import type { WorkspaceFigure } from "@/lib/customer/accounts";
import type { CurrentUser, UserBusiness, WorkspaceListItem } from "@/lib/customer/api";
import { switchWorkspaceAction } from "@/lib/customer/businessActions";
import { formatCurrency } from "@/lib/customer/currency";
import { workspaceName } from "@/lib/customer/workspaceSwitch";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { fillNodes } from "@/lib/i18n/fill";
import { plural, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";

interface ChooseWorkspaceClientProps {
  user: CurrentUser;
  // Personal first, then A to Z (orderWorkspaces); never a group.
  workspaces: UserBusiness[];
  // The card that starts picked: the remembered workspace, else the
  // personal one.
  initialId: string | null;
  // PIN-locked workspaces this device has already opened, so no PIN is
  // asked for them.
  unlockedIds: string[];
  // What each workspace's wallets hold, by workspace id; null when it
  // couldn't be read (a locked one isn't asked).
  figures: Record<string, WorkspaceFigure | null>;
  // Where to go once one is open: a page of the app, checked by the page.
  next: string;
}

// null means no trial at all (trialEndsAt was null, caller never invokes
// this). A non-null trialEndsAt in the past renders as "Trial expired"
// rather than a negative day count.
// One sentence per form, so Bangla can order it its own way, with the count
// in the reader's digits.
function trialLabel(trialEndsAt: string, t: Translate, locale: Locale): { text: string; expired: boolean } {
  const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000);
  if (daysLeft <= 0) return { text: t("Trial expired"), expired: true };
  return { text: plural(t, daysLeft, "Trial — {count} day left", "Trial — {count} days left", undefined, locale), expired: false };
}

const ROLE_LABEL: Record<UserBusiness["role"], string> = { OWNER: "Owner", ACCOUNTANT: "Accountant", STAFF: "Staff" };

// "Which workspace?" -- rendered by app/choose-workspace/page.tsx. Pick a
// card, then Open (or double-click it); a PIN-locked one this device hasn't
// opened asks for its PIN first. The choice is remembered on this device
// (switchWorkspaceAction), then the page goes on to `next`. Deliberately
// does NOT use useAuth()/AuthProvider: this page sits outside the customer
// shell.
export function ChooseWorkspaceClient({ user, workspaces, initialId, unlockedIds, figures, next }: ChooseWorkspaceClientProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? workspaces[0]?.id ?? null);
  const [pinBusiness, setPinBusiness] = useState<UserBusiness | null>(null);
  // Cancel in the PIN dialog goes back to the card or button it came from.
  const returnFocus = useReturnFocus();
  const [createOpen, setCreateOpen] = useState(false);
  // Set once a workspace opened: the page is on its way to `next`.
  const [leaving, setLeaving] = useState(false);
  const selected = workspaces.find((b) => b.id === selectedId);
  const busy = isPending || leaving;
  const isLocked = (business: UserBusiness) => business.hasPinLock && !unlockedIds.includes(business.id);

  function proceed(businessId: string) {
    startTransition(async () => {
      const result = await switchWorkspaceAction(businessId);
      if (!result.success) {
        toast.error(t(result.message ?? "Couldn't open that workspace. Please try again."));
        return;
      }
      setLeaving(true);
      router.push(next);
    });
  }

  function open() {
    if (!selected || busy) return;
    if (isLocked(selected)) {
      returnFocus.remember();
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
        <p className="text-body-lg text-ink-muted">{t("Each workspace keeps its own money and books. You can come back here any time from your name at the top right.")}</p>
      </div>

      <div className="mt-10 grid w-full max-w-[880px] grid-cols-1 justify-center gap-5 sm:grid-cols-[repeat(auto-fit,280px)]">
        {/* The cards are one radio group; the grid lays them out with the
            New workspace card. */}
        <div role="radiogroup" aria-label={t("Which workspace?")} className="contents">
          {workspaces.map((business) => {
            const isBusiness = business.type === "BUSINESS";
            const on = business.id === selectedId;
            const trial = business.trialEndsAt ? trialLabel(business.trialEndsAt, t, locale) : null;
            const figure = figures[business.id];
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
                    {isBusiness ? <Store /> : <User />}
                  </IconTile>
                  <span className="flex items-center gap-3">
                    {isLocked(business) && (
                      <span title={t("PIN lock")} className="flex items-center gap-1 text-caption font-semibold text-ink-muted">
                        <Lock className="size-3.5" aria-hidden="true" />
                        {t("PIN")}
                      </span>
                    )}
                    {on ? (
                      <span className="flex size-6 items-center justify-center rounded-full bg-emerald text-white">
                        <Check className="size-3.75" strokeWidth={3} aria-hidden="true" />
                      </span>
                    ) : (
                      <span className="size-5.5 rounded-full border-[1.5px] border-line-strong" />
                    )}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <b className="text-h3 font-bold">{workspaceName(business, user.name)}</b>
                    {business.isDefault && (
                      <Chip tone="mint" className="font-semibold">
                        {t("Default")}
                      </Chip>
                    )}
                  </span>
                  <span className="text-small text-ink-muted">{t(isBusiness ? "Business workspace" : "Personal workspace")}</span>
                </div>
                <div className="flex flex-col gap-0.5 border-t border-divider pt-4">
                  <span className="text-title font-bold tabular-nums">{figure ? formatCurrency(figure.balance, business.currency) : t(ROLE_LABEL[business.role])}</span>
                  <span className={cn("text-caption font-normal text-ink-muted", trial?.expired && "text-expense")}>
                    {trial ? trial.text : figure ? plural(t, figure.wallets, "{count} wallet", "{count} wallets", undefined, locale) : business.currency}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={busy}
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
        {fillNodes(t("Mess and family groups open from {place} inside any workspace."), { place: <b className="text-ink-2">{t("Group expenses")}</b> })}
      </p>

      <div className="mt-10">
        <Button size="xl" className="px-5" disabled={!selected || busy} onClick={open}>
          {busy ? <Loader size={18} onDark label={t("Loading...")} /> : null}
          {t("Open")}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>

      {pinBusiness && (
        <PinPromptModal
          open
          onClose={() => setPinBusiness(null)}
          businessId={pinBusiness.id}
          businessName={workspaceName(pinBusiness, user.name)}
          isOwner={pinBusiness.role === "OWNER"}
          onVerified={() => proceed(pinBusiness.id)}
          onCloseAutoFocus={returnFocus.onCloseAutoFocus}
        />
      )}

      <CreateWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(created: WorkspaceListItem) => proceed(created.id)} />
    </div>
  );
}
