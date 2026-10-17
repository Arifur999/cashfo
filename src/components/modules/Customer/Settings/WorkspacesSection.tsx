"use client";

import { Building2, CreditCard, Info, Lock, Pencil, Plus, Trash2, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { CreateWorkspaceModal } from "@/components/modules/Customer/Workspace/CreateWorkspaceModal";
import { EditWorkspaceModal } from "@/components/modules/Customer/Workspace/EditWorkspaceModal";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import type { WorkspaceListItem } from "@/lib/customer/api";
import { deleteBusinessAction, listBusinessesAction } from "@/lib/customer/businessActions";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const TYPE_LABEL = { PERSONAL: "Personal", BUSINESS: "Business", GROUP: "Group" } as const;
const ROLE_LABEL = { OWNER: "Owner", ACCOUNTANT: "Accountant", STAFF: "Staff" } as const;

const TIPS = [
  { icon: Lock, text: "A PIN asks for 4 to 6 digits before the workspace opens on this device." },
  { icon: CreditCard, text: "Every extra business workspace adds half your plan price." },
  { icon: Users, text: "Mess and family groups live in Group expenses, not here." },
];

interface WorkspacesSectionProps {
  // Read by the server page, so the list is there on the first paint.
  initialBusinesses: WorkspaceListItem[];
}

// Your personal and business workspaces, with what each one costs.
export function WorkspacesSection({ initialBusinesses }: WorkspacesSectionProps) {
  const { t } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<WorkspaceListItem[] | null>(initialBusinesses);
  const [editing, setEditing] = useState<WorkspaceListItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [removing, setRemoving] = useState<WorkspaceListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // The list needs the richer shape (phone, email, fee) the session's user
  // doesn't carry, so after every change it is fetched again.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (version === 0) return;
    let cancelled = false;
    listBusinessesAction().then((result) => {
      if (!cancelled && result.success && result.data) setBusinesses(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [version]);
  const reload = () => setVersion((v) => v + 1);

  // The personal workspace is literally named "Personal" in the database;
  // it reads better as the account holder's name.
  const displayName = (business: WorkspaceListItem) => (business.isDefault ? user.name : business.name);

  function remove() {
    if (!removing) return;
    const target = removing;
    startTransition(async () => {
      const result = await deleteBusinessAction(target.id);
      if (result.success) {
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
    <div className="flex max-w-220 flex-col gap-5">
      <Card padding="none" className="overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-h3 text-ink">{t("Workspaces")}</h2>
            <span className="text-small text-ink-muted">{t("Manage your personal and business workspaces.")}</span>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus strokeWidth={2.25} />
            {t("New workspace")}
          </Button>
        </div>
        {businesses === null && <div className="border-t border-surface-sunken px-5 py-6 text-small text-ink-muted">{t("Loading...")}</div>}
        {(businesses ?? []).map((business) => {
          const personal = business.type === "PERSONAL";
          const trialActive = business.trialEndsAt ? new Date(business.trialEndsAt) > new Date() : null;
          const contact = [business.phone, business.email].filter(Boolean).join(" · ");
          return (
            <div key={business.id} className="flex flex-col gap-3 border-t border-surface-sunken p-5 sm:flex-row sm:items-center sm:gap-4">
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", personal ? "bg-mint-50 text-emerald" : "bg-pillar-loans-soft text-pillar-loans")}>{personal ? <UserRound className="size-5" aria-hidden="true" /> : <Building2 className="size-5" aria-hidden="true" />}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <b className="text-body-lg font-semibold text-ink">{displayName(business)}</b>
                  {business.isDefault && (
                    <Chip tone="mint" size="sm">
                      {t("Default")}
                    </Chip>
                  )}
                  {business.hasPinLock && (
                    <span title={t("PIN lock on")} className="flex items-center gap-1 text-caption font-semibold text-ink-muted">
                      <Lock className="size-3" aria-hidden="true" />
                      PIN
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
                  <span className="text-small text-ink-muted">
                    {t("Extra workspace fee:")} <b className="font-semibold text-ink-2">{formatCurrency(business.monthlyFee, business.currency)}</b> {t("a month, half your plan")}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 gap-2">
                {business.role === "OWNER" && (
                  <Button variant="secondary" size="sm" onClick={() => setEditing(business)}>
                    <Pencil />
                    {t("Edit")}
                  </Button>
                )}
                {business.isDefault ? (
                  <span title={t("Your personal workspace can't be deleted. Every account always has one.")} className="flex h-9 items-center gap-2 px-3 text-body font-semibold text-ink-muted">
                    <Lock className="size-4" aria-hidden="true" />
                    {t("Can't delete")}
                  </span>
                ) : (
                  business.role === "OWNER" && (
                    <Button variant="ghost" size="sm" onClick={() => setRemoving(business)} disabled={isPending} className="text-expense hover:bg-expense-soft hover:text-expense">
                      <Trash2 />
                      {t("Delete")}
                    </Button>
                  )
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
        <div className="grid gap-3 md:grid-cols-3">
          {TIPS.map((tip) => (
            <div key={tip.text} className="flex gap-3 rounded-md bg-cream px-4 py-3">
              <tip.icon className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span className="text-small leading-normal text-ink-2">{t(tip.text)}</span>
            </div>
          ))}
        </div>
        <span className="flex items-center gap-2 text-caption text-ink-muted">
          <Info className="size-3.5" aria-hidden="true" />
          {t("Deleting a workspace removes its wallets, transactions and books for good.")}
        </span>
      </Card>

      <CreateWorkspaceModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          reload();
        }}
      />
      <EditWorkspaceModal
        business={editing}
        onClose={() => {
          setEditing(null);
          reload();
        }}
      />
      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} onConfirm={remove} isPending={isPending} danger title={t("Delete this workspace?")} description={removing ? `${displayName(removing)} ${t("and everything in it will be removed. This cannot be undone.")}` : ""} confirmLabel={t("Delete")} />
    </div>
  );
}
