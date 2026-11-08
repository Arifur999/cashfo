"use client";

import { History } from "lucide-react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { GroupActivity, GroupActivityAction } from "@/lib/customer/api";
import { activityLine } from "@/lib/customer/groupActivity";
import { formatDate, formatDay, toDateInputValue } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./GroupBits";
import type { GroupPageData } from "./groupTypes";

type Kind = "ALL" | Exclude<GroupActivityAction, "MONTH">;

const KIND_LABELS: Record<Kind, string> = { ALL: "All", ADDED: "Added", EDITED: "Edited", DELETED: "Deleted" };
const ACTION_TONES = { ADDED: "income", EDITED: "info", DELETED: "expense", MONTH: "neutral" } as const satisfies Record<GroupActivityAction, string>;
const ACTION_DOTS: Record<GroupActivityAction, string> = { ADDED: "bg-emerald", EDITED: "bg-info", DELETED: "bg-expense-fill", MONTH: "bg-ink-muted" };
const ACTION_LABELS: Record<GroupActivityAction, string> = { ADDED: "Added", EDITED: "Edited", DELETED: "Deleted", MONTH: "Month" };

interface GroupActivityTabProps {
  data: GroupPageData;
  onKind: (action: GroupActivityAction | null) => void;
  onPage: (page: number) => void;
  busy: boolean;
}

const shiftDay = (day: string, days: number) => {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// Every change made in the group (the v7 FamilyActivity board), newest
// first and by day: who added, changed or deleted what, from what to what,
// and when a month was closed. Kept forever; nothing here can be edited.
export function GroupActivityTab({ data, onKind, onPage, busy }: GroupActivityTabProps) {
  const { t, fmt } = useLocale();
  const page = data.activity;
  const kind: Kind = (data.activityAction as Kind | null) ?? "ALL";
  const entries = page?.data ?? [];
  const owner = data.members.find((member) => member.isOwner);
  const yesterday = shiftDay(data.today, -1);
  const days = entries.reduce<{ day: string; items: GroupActivity[] }[]>((list, entry) => {
    const day = toDateInputValue(entry.createdAt);
    const last = list[list.length - 1];
    if (last?.day === day) last.items.push(entry);
    else list.push({ day, items: [entry] });
    return list;
  }, []);
  const dayTitle = (day: string) => (day === data.today ? t("Today · {day}", { day: formatDay(day, "d MMM", fmt) }) : day === yesterday ? t("Yesterday · {day}", { day: formatDay(day, "d MMM", fmt) }) : formatDay(day, day.slice(0, 4) === data.today.slice(0, 4) ? "d MMM" : "d MMM yyyy", fmt));
  const total = page?.meta.total ?? 0;
  const pages = page?.meta.totalPages ?? 0;
  const current = page?.meta.page ?? 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[19px] font-semibold text-ink">{t("Activity log")}</h2>
        <p className="text-small text-ink-muted">{t("Every change in this group: who did it, and when. Lines can’t be edited or removed.")}</p>
      </div>
      <Card padding="none" aria-label={t("Activity log")} className={cn("flex flex-col gap-4 px-5 py-4", busy && "opacity-60")} asChild>
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl<Kind>
              label={t("Kind")}
              variant="tabs"
              className="rounded-full p-1"
              value={kind}
              onChange={(next) => onKind(next === "ALL" ? null : next)}
              options={(["ALL", "ADDED", "EDITED", "DELETED"] as Kind[]).map((value) => ({ value, label: KIND_LABELS[value] }))}
            />
            <span className="text-small text-ink-muted">{t("{count} changes · kept forever, can't be edited", { count: formatCount(total, fmt) })}</span>
          </div>

          {entries.length === 0 && <EmptyState icon={<History />} tone="neutral" title={kind === "ALL" ? t("No changes yet. Everything people add or change in this group will show here.") : t("Nothing matches these filters.")} />}

          {days.map((group) => (
            <div key={group.day} className="flex flex-col gap-1">
              <span className="text-caption font-semibold tracking-[0.04em] text-ink-muted uppercase">{dayTitle(group.day)}</span>
              <ul className="flex flex-col">
                {group.items.map((entry) => {
                  const line = activityLine(entry, data.members, data.currency, t, fmt);
                  const who = entry.actorName ?? owner?.name ?? t("You");
                  return (
                    <li key={entry.id} className="flex items-start gap-3 border-b border-divider py-3 last:border-b-0">
                      <span className="relative shrink-0">
                        <MemberAvatar member={owner ?? { id: "you", name: who, photoUrl: null }} members={data.members} size={36} />
                        <span aria-hidden="true" className={cn("absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-surface", ACTION_DOTS[entry.action])} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-body text-ink-2">
                          <b className="font-semibold text-ink">{who}</b> {line.verb} {line.what && <b className="font-semibold text-ink">{line.what}</b>}
                        </span>
                        {line.changes.map((change, index) => (
                          <span key={`${change.label}${index}`} className="flex flex-wrap items-center gap-1.5 text-small">
                            <span className="text-ink-muted">{change.label}:</span>
                            <span className="rounded bg-expense-soft px-1.5 text-expense line-through decoration-1">{change.from}</span>
                            <span aria-hidden="true" className="text-ink-faint">
                              →
                            </span>
                            <span className="rounded bg-income-soft px-1.5 font-semibold text-income">{change.to}</span>
                          </span>
                        ))}
                        {line.meta && <span className="text-caption text-ink-muted">{line.meta}</span>}
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-caption text-ink-muted tabular-nums">{formatDate(entry.createdAt, "h:mm a", "", fmt)}</span>
                        <Chip tone={ACTION_TONES[entry.action]} size="sm">
                          {t(ACTION_LABELS[entry.action])}
                        </Chip>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {pages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <Button variant="secondary" size="sm" disabled={current <= 1 || busy} onClick={() => onPage(current - 1)}>
                {t("Newer")}
              </Button>
              <span className="text-small text-ink-muted">{t("Page {page} of {count}", { page: formatCount(current, fmt), count: formatCount(pages, fmt) })}</span>
              <Button variant="secondary" size="sm" disabled={current >= pages || busy} onClick={() => onPage(current + 1)}>
                {t("Older")}
              </Button>
            </div>
          )}
        </section>
      </Card>
    </div>
  );
}
