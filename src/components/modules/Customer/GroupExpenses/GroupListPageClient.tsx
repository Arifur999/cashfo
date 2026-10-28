"use client";

import { Building2, House, Plus, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { deleteBusinessAction } from "@/lib/customer/businessActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GroupCard } from "./GroupCard";
import type { GroupCardData } from "./groupTypes";
import { NewGroupDrawer } from "./NewGroupDrawer";
import { formatCount } from "@/lib/i18n/digits";

interface GroupListPageClientProps {
  groups: GroupCardData[];
}

const STEPS = [
  { title: "Add the members", body: "Brothers, flatmates or mess members. They don't need a login; you record for them." },
  { title: "Record money in and out", body: "Contributions, every expense (from the fund or someone's own pocket) and, for a mess, daily meals." },
  { title: "Settle and close the month", body: "See who gets money back and who has to pay, record the payments, then lock the month." },
];

// How the two kinds of group differ, under the steps (the cards carry the chips).
const KINDS = [
  { title: "Family", body: "brothers or relatives running one home. Bazar can be shared by family size (shares), rent and bills equally.", icon: House, tone: "rounded-[14px] bg-pillar-insights-soft text-ink-2", iconTone: "text-pillar-insights" },
  { title: "Mess", body: "students or workers sharing a flat. Daily meals are counted, bazar is shared by meal rate, rent and bills equally.", icon: Building2, tone: "rounded-field bg-warning-50 text-warning-ink", iconTone: "text-warning" },
];

// Money › Group expenses: every group the person is in, with its month's
// figures, and how a group keeps the account straight.
export function GroupListPageClient({ groups }: GroupListPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<GroupCardData | null>(null);
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await attempt(() => deleteBusinessAction(target.workspace.id), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (result.success) {
        toast.success(t("Group deleted"));
        setDeleting(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete the group"));
      }
    });
  }

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={t("Money")}
        title={t("Group Expense")}
        description={t("Shared money for a family or a mess. Each member's share, dues and refunds are worked out for you.")}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus strokeWidth={2.25} />
            {t("New group")}
          </Button>
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={t("No group yet")}
          description={t("A family running one home, or a mess sharing a flat: add the members and record who paid what.")}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus strokeWidth={2.25} />
              {t("New group")}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <GroupCard key={group.workspace.id} group={group} onDelete={() => setDeleting(group)} />
          ))}
        </div>
      )}

      <Card padding="none" className="flex flex-col gap-4 px-6 py-5">
        <h2 className="text-title font-semibold text-ink">{t("How a group keeps the account straight")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-mint-50 text-small font-bold text-emerald">{formatCount(i + 1, fmt)}</span>
              <div className="flex flex-col gap-0.75">
                <span className="text-body font-semibold text-ink">{t(step.title)}</span>
                <span className="text-small leading-relaxed text-ink-muted">{t(step.body)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {KINDS.map((kind) => (
            <div key={kind.title} role="note" className={cn("flex items-start gap-2.5 px-3.5 py-3 text-small leading-normal", kind.tone)}>
              <kind.icon className={cn("mt-0.5 size-4 shrink-0", kind.iconTone)} aria-hidden="true" />
              <span>
                <b className="font-semibold">{t(kind.title)}</b> · {t(kind.body)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <NewGroupDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => !isPending && setDeleting(null)}
        onConfirm={remove}
        icon={<Trash2 />}
        title={t("Delete {name}?", { name: deleting?.workspace.name ?? "" })}
        description={t("Removes the group with every member, entry and closed month. This can't be undone.")}
        confirmLabel={t("Delete group")}
        isPending={isPending}
      />
    </PageFrame>
  );
}
