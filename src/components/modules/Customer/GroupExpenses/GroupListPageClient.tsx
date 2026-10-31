"use client";

import { Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import EmptyState from "@/components/smartly/EmptyState";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { updateBusinessAction } from "@/lib/customer/businessActions";
import { updateGroupSettingsAction } from "@/lib/customer/groupExpensesActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { GroupCard } from "./GroupCard";
import { GroupDialog } from "./GroupDialog";
import type { GroupCardData } from "./groupTypes";
import { NewGroupDialog } from "./NewGroupDialog";

interface GroupListPageClientProps {
  groups: GroupCardData[];
  today: string;
}

// Group Expense (the v7 GroupList board): every group the person is in,
// with its month's budget, spending and who has paid in. Paused groups go
// last. A group is renamed, paused or resumed from its card's menu, and
// deleted from its Settings.
export function GroupListPageClient({ groups, today }: GroupListPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<GroupCardData | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const sorted = [...groups].sort((a, b) => Number(!!a.settings.pausedAt) - Number(!!b.settings.pausedAt));

  function openRename(group: GroupCardData) {
    setRenaming(group);
    setNewName(group.workspace.name);
    setError("");
  }

  function rename() {
    if (!renaming) return;
    const trimmed = newName.trim();
    const found = !trimmed ? t("Give the group a name.") : groups.some((group) => group.workspace.id !== renaming.workspace.id && group.workspace.name.trim().toLowerCase() === trimmed.toLowerCase()) ? t("Another group already has this name.") : "";
    setError(found);
    if (found || isPending) return;
    const target = renaming;
    startTransition(async () => {
      const result = await attempt(() => updateBusinessAction(target.workspace.id, { name: trimmed }), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (result.success) {
        toast.success(t("Group renamed"));
        setRenaming(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to rename the group"));
      }
    });
  }

  function togglePause(group: GroupCardData) {
    const paused = !group.settings.pausedAt;
    startTransition(async () => {
      const result = await attempt(() => updateGroupSettingsAction(group.workspace.id, { paused }), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (result.success) {
        toast.success(paused ? t("{name} is paused", { name: group.workspace.name }) : t("{name} is running again", { name: group.workspace.name }));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save the settings"));
      }
    });
  }

  return (
    <PageFrame className="gap-6">
      <PageHeader
        title={t("Group Expense")}
        description={<span className="inline-flex h-6 items-center rounded-full bg-emerald-soft px-3 text-caption font-semibold text-emerald">{t("Free forever · unlimited groups and members")}</span>}
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
          description={t("A family running one home: add the members and record who paid what.")}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus strokeWidth={2.25} />
              {t("New group")}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sorted.map((group) => (
            <GroupCard key={group.workspace.id} group={group} today={today} onRename={() => openRename(group)} onTogglePause={() => togglePause(group)} />
          ))}
        </div>
      )}

      <NewGroupDialog open={createOpen} onClose={() => setCreateOpen(false)} takenNames={groups.map((group) => group.workspace.name)} />
      <GroupDialog
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        busy={isPending}
        width={420}
        title={t("Rename group")}
        onSubmit={(event) => {
          event.preventDefault();
          rename();
        }}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setRenaming(null)} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader />}
              {t("Save")}
            </Button>
          </>
        }
      >
        <Field htmlFor="rename-group" label={<span className="text-body font-medium text-ink">{t("Group name")}</span>} error={error || undefined}>
          <Input id="rename-group" size="md" value={newName} onChange={(event) => setNewName(event.target.value)} autoFocus maxLength={80} invalid={!!error} />
        </Field>
      </GroupDialog>
    </PageFrame>
  );
}
