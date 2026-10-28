"use client";

import { ArrowRight, Check, CreditCard, Info, Lock, Pencil, Plus, Store, Trash2, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { CreateWorkspaceModal } from "@/components/modules/Customer/Workspace/CreateWorkspaceModal";
import { EditWorkspaceModal } from "@/components/modules/Customer/Workspace/EditWorkspaceModal";
import { useWorkspaceSwitch } from "@/components/modules/Customer/Workspace/useWorkspaceSwitch";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import ErrorState from "@/components/smartly/ErrorState";
import IconTile from "@/components/smartly/IconTile";
import type { WorkspaceListItem } from "@/lib/customer/api";
import { deleteBusinessAction, listBusinessesAction, switchWorkspaceAction } from "@/lib/customer/businessActions";
import { formatCurrency } from "@/lib/customer/currency";
import { ownWorkspaces } from "@/lib/customer/settingsDisplay";
import { workspaceName } from "@/lib/customer/workspaceSwitch";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const TYPE_LABEL = { PERSONAL: "Personal", BUSINESS: "Business", GROUP: "Group" } as const;
const ROLE_LABEL = { OWNER: "Owner", ACCOUNTANT: "Accountant", STAFF: "Staff" } as const;

const TIPS = [
  { icon: Lock, text: "A PIN asks for 4 to 6 digits before the workspace opens on this device." },
  { icon: CreditCard, text: "Every extra business workspace adds half your plan price." },
  { icon: Users, text: "Mess and family groups live in Group expenses, not here." },
];

// Under a finger every row button is 44px tall.
const ROW_BUTTON = "pointer-coarse:h-11";

interface WorkspacesSectionProps {
  // Read by the server page, so the list is there on the first paint; null
  // when it couldn't be read (the card then says so, with Try again).
  initialBusinesses: WorkspaceListItem[] | null;
}

// Your personal and business workspaces, with what each one costs. Open
// switches into one and goes to its Home; a new one offers the same in its
// toast.
export function WorkspacesSection({ initialBusinesses }: WorkspacesSectionProps) {
  const { t, fmt } = useLocale();
  const { user, activeBusinessId } = useAuth();
  const router = useRouter();
  const switcher = useWorkspaceSwitch({ land: "home" });
  const [businesses, setBusinesses] = useState<WorkspaceListItem[] | null>(initialBusinesses);
  const [editing, setEditing] = useState<WorkspaceListItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [removing, setRemoving] = useState<WorkspaceListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // The list needs the richer shape (phone, email, fee) the session's user
  // doesn't carry, so after every change it is fetched again. A failed
  // fetch keeps the list on screen and says so; with no list yet, the card
  // keeps its Try again.
  const [version, setVersion] = useState(0);
  const [reading, setReading] = useState(false);
  const settle = useEffectEvent((result: Awaited<ReturnType<typeof listBusinessesAction>> | null) => {
    setReading(false);
    if (result?.success && result.data) setBusinesses(result.data);
    else toast.error(t("Couldn't load your workspaces"));
  });
  useEffect(() => {
    if (version === 0) return;
    let cancelled = false;
    listBusinessesAction().then(
      (result) => {
        if (!cancelled) settle(result);
      },
      () => {
        if (!cancelled) settle(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [version]);
  const reload = () => {
    setReading(true);
    setVersion((v) => v + 1);
  };

  // The personal workspace is literally named "Personal" in the database;
  // it reads better as the account holder's name.
  const displayName = (business: WorkspaceListItem) => workspaceName(business, user.name);

  function remove() {
    if (!removing) return;
    const target = removing;
    startTransition(async () => {
      const result = await deleteBusinessAction(target.id);
      if (result.success) {
        // The open workspace is gone: the personal one opens instead, so
        // the app doesn't stop to ask which.
        const personal = businesses?.find((business) => business.isDefault);
        if (target.id === activeBusinessId && personal) await switchWorkspaceAction(personal.id);
        toast.success(t("Workspace deleted"));
        setRemoving(null);
        reload();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete workspace"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-h3 text-ink">{t("Your workspaces")}</h2>
            <span className="text-small text-ink-muted">{t("Manage your personal and business workspaces.")}</span>
          </div>
          <Button onClick={() => setCreateOpen(true)} className={ROW_BUTTON}>
            <Plus strokeWidth={2.25} />
            {t("New workspace")}
          </Button>
        </div>
        {businesses === null &&
          (reading ? (
            <div className="flex justify-center border-t border-divider py-10">
              <Loader size={24} label="Loading..." />
            </div>
          ) : (
            // Nothing listed is not "no workspaces": the personal one always
            // exists, and a second one made now would be a duplicate.
            <div className="border-t border-divider">
              <ErrorState bordered={false} title={t("Couldn't load your workspaces")} onRetry={reload} />
            </div>
          ))}
        {/* Family and mess groups live in Group expenses, not here, as the
            card below says. */}
        {ownWorkspaces(businesses ?? []).map((business) => {
          const isBusiness = business.type === "BUSINESS";
          const trialActive = business.trialEndsAt ? new Date(business.trialEndsAt) > new Date() : null;
          const contact = [business.phone, business.email].filter(Boolean).join(" · ");
          const active = business.id === activeBusinessId;
          const opening = business.id === switcher.pendingId;
          const name = displayName(business);
          return (
            // The section's own width decides when the buttons fit beside
            // the name: from 1024px the rail leaves the section 440px.
            <div key={business.id} className="flex flex-col gap-3 border-t border-divider p-5 @xl:flex-row @xl:items-center @xl:gap-4">
              {/* The icon stays beside the name at every width; only this
                  pair and the buttons stack on a narrow section. */}
              <div className="flex min-w-0 flex-1 items-start gap-3 @xl:items-center @xl:gap-4">
                {/* The account menu's and the drawer's icons for the same workspace. */}
                <IconTile size={40} tone={isBusiness ? "loans" : "money"}>
                  {isBusiness ? <Store /> : <User />}
                </IconTile>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="min-w-0 text-body-lg font-semibold wrap-break-word text-ink">{name}</b>
                    {active && (
                      // A status marker like the PIN-lock one, not a pill, so it
                      // never reads as a second mint "Default" beside it.
                      <span className="flex items-center gap-1 text-caption font-semibold text-emerald">
                        <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                        {t("Active")}
                      </span>
                    )}
                    {business.isDefault && (
                      <Chip tone="mint" size="sm">
                        {t("Default")}
                      </Chip>
                    )}
                    {business.hasPinLock && (
                      <span title={t("PIN lock on")} className="flex items-center gap-1 text-caption font-semibold text-ink-muted">
                        <Lock className="size-3" aria-hidden="true" />
                        <span aria-hidden="true">{t("PIN")}</span>
                        <span className="sr-only">{t("PIN lock on")}</span>
                      </span>
                    )}
                    {business.trialEndsAt && (
                      <Chip tone={trialActive ? "warning" : "expense"} size="sm">
                        {t(trialActive ? "Trial" : "Trial expired")}
                      </Chip>
                    )}
                  </span>
                  <span className="text-small text-ink-muted">
                    {t(TYPE_LABEL[business.type])} · {t(ROLE_LABEL[business.role])}
                  </span>
                  {contact && <span className="truncate text-small text-ink-muted">{contact}</span>}
                  {business.monthlyFee !== null && (
                    <span className="text-small text-ink-muted">{fillNodes(t("Extra workspace fee: {amount} a month, half your plan"), { amount: <b className="font-semibold text-ink-2">{formatCurrency(business.monthlyFee, business.currency, fmt)}</b> })}</span>
                  )}
                  {/* Said in words: a tooltip never shows under a finger or to most screen readers. */}
                  {business.isDefault && <span className="text-caption text-ink-muted">{t("Your personal workspace always stays.")}</span>}
                </span>
              </div>
              <span className="flex shrink-0 flex-wrap gap-2">
                {!active && (
                  // Named for its workspace, or a screen reader lists "Open, Open, Open".
                  <Button variant="secondary" size="sm" onClick={() => switcher.choose(business)} disabled={switcher.busy} aria-busy={opening || undefined} aria-label={t("Open {name}", { name })} className={ROW_BUTTON}>
                    {opening ? <Loader size={14} label={t("Loading...")} /> : switcher.isLocked(business) && <Lock aria-hidden="true" />}
                    {t("Open")}
                    {!opening && <ArrowRight aria-hidden="true" />}
                  </Button>
                )}
                {business.role === "OWNER" && (
                  <Button variant="secondary" size="sm" onClick={() => setEditing(business)} aria-label={t("Edit {name}", { name })} className={ROW_BUTTON}>
                    <Pencil />
                    {t("Edit")}
                  </Button>
                )}
                {!business.isDefault && business.role === "OWNER" && (
                  <Button variant="ghost" size="sm" onClick={() => setRemoving(business)} disabled={isPending} aria-label={t("Delete {name}", { name })} className={`text-expense hover:bg-expense-soft hover:text-expense ${ROW_BUTTON}`}>
                    <Trash2 />
                    {t("Delete")}
                  </Button>
                )}
              </span>
            </div>
          );
        })}
      </Card>

      <Card padding="none" className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-h3 text-ink">{t("Editing a workspace")}</h3>
          <span className="text-small text-ink-muted">{t("Edit changes the name, phone, email and PIN lock.")}</span>
        </div>
        <div className="grid gap-3 @2xl:grid-cols-3">
          {TIPS.map((tip) => (
            <div key={tip.text} className="flex gap-3 rounded-md bg-strip px-4 py-3">
              <tip.icon className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span className="text-small leading-normal text-ink-2">{t(tip.text)}</span>
            </div>
          ))}
        </div>
        <span className="flex items-start gap-2 text-caption text-ink-muted">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {t("Deleting a workspace removes its wallets, transactions and books for good.")}
        </span>
      </Card>

      <CreateWorkspaceModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          reload();
        }}
        offerOpen={(created) => switcher.choose(created)}
      />
      <EditWorkspaceModal
        business={editing}
        onClose={() => {
          setEditing(null);
          reload();
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        isPending={isPending}
        danger
        title={t("Delete this workspace?")}
        description={removing ? t("{name} and everything in it will be removed. This cannot be undone.", { name: displayName(removing) }) : ""}
        confirmLabel={t("Delete")}
      />
      {switcher.pinPrompt}
    </div>
  );
}
