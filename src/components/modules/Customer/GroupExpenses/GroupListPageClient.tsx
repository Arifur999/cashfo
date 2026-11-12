"use client";

import { LayoutGrid, Menu, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import PageFrame from "@/components/smartly/PageFrame";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useStoredChoice } from "@/components/modules/Customer/Balance/useStoredChoice";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { deleteBusinessAction, updateBusinessAction } from "@/lib/customer/businessActions";
import { updateGroupSettingsAction } from "@/lib/customer/groupExpensesActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GroupCard, GroupMenu, type GroupRowActions, groupRowView, RoleChip } from "./GroupCard";
import type { GroupCardData } from "./groupTypes";
import { NewGroupDialog } from "./NewGroupDialog";

interface GroupListPageClientProps {
  groups: GroupCardData[];
  today: string;
}

type View = "cards" | "table";
const VIEW_KEY = "smartly-group-view";
const PER_PAGE = 10;

// Group Expense › All groups (the v16 GroupList board): every group the
// person runs, as cards or a table, with its month's budget, spending and
// my balance. Paused groups go last. A group is renamed, paused, resumed or
// (while nothing was ever recorded in it) deleted from its ⋯ menu.
export function GroupListPageClient({ groups, today }: GroupListPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [view, pick] = useStoredChoice<View>(VIEW_KEY, ["cards", "table"], "cards");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<GroupCardData | null>(null);
  const [deleting, setDeleting] = useState<GroupCardData | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const sorted = [...groups].sort((a, b) => Number(!!a.settings.pausedAt) - Number(!!b.settings.pausedAt));
  const only = groups.length === 1;
  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const shown = Math.min(page, pages - 1);

  function openRename(group: GroupCardData) {
    setRenaming(group);
    setNewName(group.workspace.name);
    setError("");
  }

  function rename() {
    if (!renaming) return;
    const trimmed = newName.trim();
    const found = !trimmed ? t("Give the group a name.") : groups.some((group) => group.workspace.id !== renaming.workspace.id && group.workspace.name.trim().toLowerCase() === trimmed.toLowerCase()) ? t("You already have a group with this name.") : "";
    setError(found);
    if (found || isPending) return;
    if (trimmed === renaming.workspace.name) return setRenaming(null);
    const target = renaming;
    startTransition(async () => {
      const result = await attempt(() => updateBusinessAction(target.workspace.id, { name: trimmed }), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (result.success) {
        toast.success(t("Renamed to {name}", { name: trimmed }));
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

  function remove() {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await attempt(() => deleteBusinessAction(target.workspace.id), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (result.success) {
        toast.success(t("Deleted {name}", { name: target.workspace.name }));
        setDeleting(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete the group"));
      }
    });
  }

  const actionsFor = (group: GroupCardData): GroupRowActions => ({ onRename: () => openRename(group), onTogglePause: () => togglePause(group), onDelete: () => setDeleting(group) });
  const views: { value: View; label: string; icon: typeof LayoutGrid }[] = [
    { value: "cards", label: t("Cards"), icon: LayoutGrid },
    { value: "table", label: t("Table"), icon: Menu },
  ];

  return (
    <PageFrame className="gap-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="flex min-w-0 flex-1 basis-full flex-col gap-1 sm:basis-auto">
          <h1 className="text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("All groups")}</h1>
          <span className="text-[13.5px] text-ink-muted">{groups.length === 0 ? t("Make your first group with “New group”.") : t(groups.length === 1 ? "{count} group you run. Open it to see its money." : "{count} groups you run. Open one to see its money.", { count: formatCount(groups.length, fmt) })}</span>
        </div>
        <div role="group" aria-label={t("Show as")} className="flex shrink-0 gap-0.5 rounded-full bg-quiet-chip p-0.75">
          {views.map((item) => (
            <button key={item.value} type="button" aria-pressed={view === item.value} onClick={() => pick(item.value)} className={cn("flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold", view === item.value ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,32,29,0.12)]" : "text-ink-soft hover:text-ink")}>
              <item.icon className="size-3.5" strokeWidth={2} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
        <Button size="lg" onClick={() => setCreateOpen(true)} className="gap-1.5 px-4.5">
          <Plus className="size-4" strokeWidth={2.5} />
          {t("New group")}
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-input bg-surface px-6 py-12 text-center">
          <span className="text-title font-semibold text-ink">{t("No groups yet")}</span>
          <span className="text-[13.5px] text-ink-muted">{t("Make your first group with “New group”.")}</span>
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {sorted.map((group) => (
            <GroupCard key={group.workspace.id} group={group} today={today} only={only} actions={actionsFor(group)} />
          ))}
        </div>
      ) : (
        <section className="overflow-x-auto rounded-card border border-line-card bg-surface shadow-card">
          <table className="w-full min-w-[860px] table-fixed border-collapse text-[13.5px]">
            <thead>
              <tr className="text-left text-caption text-ink-muted">
                <th className="w-[27%] py-3 pr-3 pl-5 font-semibold">{t("Group")}</th>
                <th className="w-[9%] p-3 font-semibold">{t("Members")}</th>
                <th className="w-[22%] p-3 font-semibold">{t("Spent in {month}", { month: groupRowView(sorted[0], today, t, fmt).month })}</th>
                <th className="w-[13%] p-3 font-semibold">{t("My role")}</th>
                <th className="w-[14%] p-3 text-right font-semibold">{t("My balance")}</th>
                <th className="w-[15%] py-3 pr-5 pl-3 font-semibold">
                  <span className="sr-only">{t("Actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(shown * PER_PAGE, (shown + 1) * PER_PAGE).map((group) => {
                const row = groupRowView(group, today, t, fmt);
                return (
                  <tr key={group.workspace.id} className={cn("border-t border-divider hover:bg-row-hover", row.paused && "bg-hover")}>
                    <td className="py-3 pr-3 pl-5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4.25", row.kind.cls)}>
                          <row.kind.icon strokeWidth={1.9} aria-hidden="true" />
                        </span>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <Link href={row.href} title={group.workspace.name} className="truncate text-body font-semibold text-ink hover:underline">
                            {group.workspace.name}
                          </Link>
                          <span className="text-caption whitespace-nowrap text-ink-muted">{row.paused ? `${t(row.kind.label)} · ${t("Paused")}` : t(row.kind.label)}</span>
                        </span>
                      </div>
                    </td>
                    <td className="p-3 tabular-nums">{formatCount(row.count, fmt)}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1.25">
                        <span className="truncate tabular-nums">
                          <b className="font-semibold">{row.spent}</b>
                          <span className="text-ink-muted"> {row.hasBudget ? t("of {amount}", { amount: row.budget }) : t("· no budget")}</span>
                        </span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                          <span className={cn("block h-full", row.barClass)} style={{ width: `${row.bar}%` }} />
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <RoleChip isAdmin={row.isAdmin} short />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={cn("font-semibold whitespace-nowrap tabular-nums", row.balanceClass)}>{row.balance}</span>
                        <span className="text-[11.5px] whitespace-nowrap text-ink-muted">{row.balanceHint}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-5 pl-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={row.href} className="flex h-8.5 items-center rounded-full border border-input bg-surface px-3.5 text-[13px] font-semibold text-emerald hover:bg-emerald-wash">
                          {t("Open")}
                        </Link>
                        {row.isAdmin && <GroupMenu group={group} only={only} open={row.href} actions={actionsFor(group)} withOpen={false} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-2.5 border-t border-divider px-5 py-2.5 text-[13px] text-ink-muted">
              <span>{t("Page {page} of {pages}", { page: formatCount(shown + 1, fmt), pages: formatCount(pages, fmt) })}</span>
              <div className="flex gap-2">
                <button type="button" disabled={shown === 0} onClick={() => setPage(shown - 1)} className="h-8.5 rounded-full border border-input bg-surface px-3.5 font-semibold text-ink disabled:opacity-50">
                  {t("Previous")}
                </button>
                <button type="button" disabled={shown >= pages - 1} onClick={() => setPage(shown + 1)} className="h-8.5 rounded-full border border-input bg-surface px-3.5 font-semibold text-ink disabled:opacity-50">
                  {t("Next")}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <NewGroupDialog open={createOpen} onClose={() => setCreateOpen(false)} takenNames={groups.map((group) => group.workspace.name)} />

      <AlertDialog open={renaming !== null} onOpenChange={(next) => !next && !isPending && setRenaming(null)}>
        <AlertDialogContent className="w-[440px] max-w-[calc(100vw-32px)] gap-0 rounded-card border-0 bg-surface p-0 shadow-overlay ring-0">
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              rename();
            }}
            className="flex flex-col gap-3.5 px-6 py-5.5"
          >
            <AlertDialogTitle className="text-[18px] font-bold tracking-normal text-ink">{t("Rename group")}</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">{t("Rename group")}</AlertDialogDescription>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-2">{t("Group name")}</span>
              <input
                value={newName}
                onChange={(event) => {
                  setNewName(event.target.value);
                  setError("");
                }}
                autoFocus
                maxLength={40}
                aria-invalid={!!error || undefined}
                className={cn("h-11 w-full rounded-field border bg-surface px-2.5 text-body text-ink outline-none focus:border-focus-ring focus:focus-halo", error ? "border-expense" : "border-input")}
              />
            </label>
            {error && (
              <span role="alert" className="-mt-1.5 text-[12.5px] text-expense">
                {error}
              </span>
            )}
            <div className="flex justify-end gap-2.5">
              <Button type="button" variant="secondary" size="lg" onClick={() => setRenaming(null)} disabled={isPending} className="px-4.5">
                {t("Cancel")}
              </Button>
              <Button type="submit" size="lg" disabled={isPending}>
                {isPending && <Loader />}
                {t("Save")}
              </Button>
            </div>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        isPending={isPending}
        icon={<Trash2 />}
        title={deleting ? t("Delete {name}?", { name: deleting.workspace.name }) : ""}
        description={deleting ? t("It has no money entries. Its {count} members, categories and budget are removed too.", { count: formatCount(deleting.members.length, fmt) }) : ""}
        confirmLabel={t("Delete")}
      />
    </PageFrame>
  );
}
