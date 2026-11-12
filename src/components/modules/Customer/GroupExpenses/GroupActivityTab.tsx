"use client";

import { ChevronLeft, ChevronRight, Lock, Pencil, Plus, Search, Settings2, ShieldCheck, Trash2, Users } from "lucide-react";
import { useState } from "react";
import type { GroupActivity, GroupActivityAction } from "@/lib/customer/api";
import { activityLine } from "@/lib/customer/groupActivity";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./GroupBits";
import { ROLE_CHIP, roleKey } from "./GroupSetup";
import type { GroupPageData } from "./groupTypes";

type Topic = "all" | "money" | "roles" | "members" | "month" | "settings";

const TOPICS: { value: Topic; label: string }[] = [
  { value: "all", label: "All" },
  { value: "money", label: "Money entries" },
  { value: "roles", label: "Roles & access" },
  { value: "members", label: "Members" },
  { value: "month", label: "Month closing" },
  { value: "settings", label: "Settings" },
];

// What a line is about, as the board's tabs sort them.
function topicOf(entry: GroupActivity): Exclude<Topic, "all"> {
  if (entry.entity === "MONTH" || entry.action === "MONTH") return "month";
  if (["EXPENSE", "CONTRIBUTION", "SETTLE", "HANDOVER", "MEALS"].includes(entry.entity)) return "money";
  if (entry.entity === "ACCESS" || (entry.entity === "MEMBER" && entry.change?.some((change) => change.field === "role"))) return "roles";
  if (entry.entity === "MEMBER") return "members";
  return "settings";
}

const ACTION_KIND: Record<GroupActivityAction, { label: string; cls: string; icon: typeof Plus }> = {
  ADDED: { label: "Added", cls: "bg-success-soft text-tint-green-ink", icon: Plus },
  EDITED: { label: "Edited", cls: "bg-info-soft text-info", icon: Pencil },
  DELETED: { label: "Deleted", cls: "bg-expense-soft text-expense", icon: Trash2 },
  MONTH: { label: "Month", cls: "bg-surface-sunken text-ink-2", icon: Lock },
};
const TOPIC_KIND: Partial<Record<Topic, { label: string; cls: string; icon: typeof Plus }>> = {
  roles: { label: "Role", cls: "bg-mint-50 text-emerald", icon: ShieldCheck },
  members: { label: "Member", cls: "bg-quiet-chip text-ink-2", icon: Users },
  settings: { label: "Settings", cls: "bg-quiet-chip text-ink-2", icon: Settings2 },
};

// When, who, what happened and its kind, newest first.
const COLUMNS = "md:grid-cols-[150px_220px_minmax(0,1fr)_120px]";

interface GroupActivityTabProps {
  data: GroupPageData;
  onPage: (page: number) => void;
  busy: boolean;
}

// The Activity log (the v16 FamilyActivity board): every change made in the
// group -- who did it, when, and what -- sorted into money entries, roles and
// access, members, month closing and settings. Kept forever; nothing here
// can be edited.
export function GroupActivityTab({ data, onPage, busy }: GroupActivityTabProps) {
  const { t, fmt } = useLocale();
  const [topic, setTopic] = useState<Topic>("all");
  const [who, setWho] = useState("");
  const [query, setQuery] = useState("");
  const page = data.activity;
  const entries = page?.data ?? [];
  const owner = data.members.find((member) => member.isOwner);
  const pages = page?.meta.totalPages ?? 0;
  const current = page?.meta.page ?? 1;
  const total = page?.meta.total ?? 0;
  const perPage = page?.meta.limit ?? entries.length;
  // The page's lines, in the reader's words.
  const lines = entries.map((entry) => {
    const line = activityLine(entry, data.members, data.currency, t, fmt);
    const actor = entry.actorName ?? owner?.name ?? t("You");
    return { entry, line, actor, topic: topicOf(entry), text: [line.verb, line.what, line.meta].filter(Boolean).join(" ") };
  });
  const actors = [...new Set(lines.map((row) => row.actor))];
  const words = query.trim().toLowerCase();
  const shown = lines.filter((row) => (topic === "all" || row.topic === topic) && (!who || row.actor === who) && (!words || `${row.actor} ${row.text}`.toLowerCase().includes(words)));
  // Counts are only shown when every line is on this one page.
  const counted = pages <= 1;
  const countOf = (value: Topic) => (value === "all" ? lines.length : lines.filter((row) => row.topic === value).length);
  const from = total === 0 ? 0 : (current - 1) * perPage + 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-[20px] font-semibold text-ink">{t("Activity log")}</h2>
        <p className="text-[13.5px] text-ink-muted">{t("Every change in this group: who did it, and when. Lines can’t be edited or removed.")}</p>
      </div>

      <section aria-label={t("Activity log")} className={cn("flex flex-col overflow-hidden rounded-card border border-line-card bg-surface shadow-card", busy && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-2.5 px-5 py-3">
          <label className="relative w-full md:w-65">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("Search what happened or a name…")} placeholder={t("Search what happened or a name…")} className="h-9.5 w-full rounded-field border border-input bg-surface pr-3 pl-9 text-[13px] text-ink outline-none focus:border-focus-ring focus:focus-halo" />
          </label>
          <select value={who} onChange={(event) => setWho(event.target.value)} aria-label={t("Who")} className="h-9.5 rounded-field border border-input bg-surface px-3 text-[13px] font-medium text-ink outline-none focus:border-focus-ring">
            <option value="">{t("Everyone")}</option>
            {actors.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <div role="tablist" aria-label={t("Kind")} className="ml-auto flex flex-wrap gap-0.5 rounded-full bg-quiet-chip p-0.75">
            {TOPICS.map((item) => {
              const on = topic === item.value;
              return (
                <button key={item.value} type="button" role="tab" aria-selected={on} onClick={() => setTopic(item.value)} className={cn("flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-semibold", on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,32,29,0.12)]" : "text-ink-soft hover:text-ink")}>
                  {t(item.label)}
                  {counted && <span className="font-normal text-ink-muted tabular-nums">{formatCount(countOf(item.value), fmt)}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div role="row" className={cn("hidden gap-x-3 border-y border-line bg-table-head px-5 py-2.25 text-caption font-semibold text-ink-muted md:grid", COLUMNS)}>
          <span>{t("When")}</span>
          <span>{t("Who")}</span>
          <span>{t("What happened")}</span>
          <span className="text-right">{t("Kind")}</span>
        </div>
        {shown.length === 0 && <p className="px-5 py-7 text-center text-body text-ink-muted">{entries.length === 0 ? t("No changes yet. Everything people add or change in this group will show here.") : t("Nothing matches these filters.")}</p>}
        {shown.map(({ entry, line, actor, topic: about }) => {
          const kind = TOPIC_KIND[about] ?? ACTION_KIND[entry.action];
          const byOwner = !entry.actorName || entry.actorName === owner?.name;
          const member = byOwner ? owner : data.members.find((m) => m.name === entry.actorName);
          const role = member ? ROLE_CHIP[roleKey(member)] : null;
          return (
            <div key={entry.id} role="row" className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-divider px-5 py-2.5 text-body", COLUMNS)}>
              <span className="flex flex-col max-md:hidden">
                <span className="font-semibold text-ink tabular-nums">{formatDate(entry.createdAt, "d MMM yy", "", fmt)}</span>
                <span className="text-caption text-ink-muted tabular-nums">{formatDate(entry.createdAt, "h:mm a", "", fmt)}</span>
              </span>
              <span className="flex min-w-0 items-center gap-2.5 max-md:hidden">
                <MemberAvatar member={member ?? { id: entry.actorUserId ?? entry.id, name: actor, photoUrl: null }} members={data.members} size={32} />
                <span className="flex min-w-0 flex-col items-start gap-0.5">
                  <span className="truncate font-semibold text-ink">{actor}</span>
                  {role && <span className={cn("rounded-full px-1.75 text-[11px] leading-4 font-semibold", role.cls)}>{t(role.label)}</span>}
                </span>
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-ink-2">
                  <span className="md:hidden">
                    <b className="font-semibold text-ink">{actor}</b>{" "}
                  </span>
                  {line.verb.charAt(0).toUpperCase() + line.verb.slice(1)} {line.what && <b className="font-semibold text-ink">{line.what}</b>}
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
                <span className="text-caption text-ink-muted md:hidden">{formatDate(entry.createdAt, "d MMM yy · h:mm a", "", fmt)}</span>
              </span>
              <span className="flex justify-end">
                <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-1 text-[12.5px] font-semibold", kind.cls)}>
                  <span className="flex size-5 items-center justify-center rounded-full bg-current/15 [&_svg]:size-3">
                    <kind.icon strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  {t(kind.label)}
                </span>
              </span>
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-3 bg-hover px-5 py-3 text-[13px] text-ink-muted">
          <span>{t("Showing {from} to {to} of {count} · newest first", { from: formatCount(from, fmt), to: formatCount(from + entries.length - (total ? 1 : 0), fmt), count: formatCount(total, fmt) })}</span>
          {pages > 1 && (
            <span className="flex gap-2">
              <button type="button" disabled={current <= 1 || busy} onClick={() => onPage(current - 1)} aria-label={t("Newer")} className="flex size-8 items-center justify-center rounded-full border border-line bg-surface text-ink-soft disabled:opacity-40">
                <ChevronLeft className="size-3.75" aria-hidden="true" />
              </button>
              <button type="button" disabled={current >= pages || busy} onClick={() => onPage(current + 1)} aria-label={t("Older")} className="flex size-8 items-center justify-center rounded-full border border-line bg-surface text-ink-soft disabled:opacity-40">
                <ChevronRight className="size-3.75" aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
      </section>
      <p className="text-[12.5px] text-ink-muted">{t("The role shown is the person’s role today.")}</p>
    </div>
  );
}
