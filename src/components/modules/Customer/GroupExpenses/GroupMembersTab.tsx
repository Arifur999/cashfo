"use client";

import { Eye, Pencil, Search, UserCheck, UserMinus, UserPlus, Users, UserX } from "lucide-react";
import { useState } from "react";
import type { GroupMember } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { countLabel } from "@/lib/customer/groupDisplay";
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./GroupBits";
import { ROLE_CHIP, roleKey } from "./GroupSetup";
import type { GroupPageData, GroupView } from "./groupTypes";

type Filter = "all" | "ACCOUNTANT" | "VIEWER" | "MEMBER" | "left";

interface GroupMembersTabProps {
  data: GroupPageData;
  view: GroupView;
  onAdd: () => void;
  onEdit: (member: GroupMember) => void;
  // Mark someone as left the group (asks first), or bring them back.
  onToggleStatus: (member: GroupMember) => void;
}

// #, member, phone, shares, role, access, balance now, actions.
const COLUMNS = "md:grid-cols-[34px_minmax(0,1fr)_124px_56px_112px_220px_124px_84px]";
const ACT = "flex size-8.5 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-muted transition-colors hover:border-mint-200 hover:bg-emerald-wash hover:text-emerald [&_svg]:size-3.75";

// 01711-482915, as the boards write a number.
const phoneShow = (value: string) => {
  const digits = value.replace(/[\s-]/g, "").replace(/^\+?88/, "");
  return /^01\d{9}$/.test(digits) ? `${digits.slice(0, 5)}-${digits.slice(5)}` : value;
};

// Members & access (the v16 FamilyMembers board): a tile per kind of access
// that filters the list, and each member's phone, shares, role, the cash
// they keep, whether they can log in and their balance now.
export function GroupMembersTab({ data, view, onAdd, onEdit, onToggleStatus }: GroupMembersTabProps) {
  const { t, fmt } = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const isAdmin = data.role === "OWNER";
  const money = (value: number) => formatCurrency(value, data.currency, fmt);
  const active = view.activeMembers;
  const gone = data.members.filter((member) => member.status !== "ACTIVE");
  const cash = Object.fromEntries((data.settlement.accountantCash ?? []).map((row) => [row.groupMemberId, Number(row.cash)]));
  const canLogIn = (member: GroupMember) => !!member.access?.login && !member.isOwner;
  const totalShares = active.reduce((sum, member) => sum + Number(member.shareUnits), 0);
  const ofRole = (role: "ACCOUNTANT" | "VIEWER" | "MEMBER") => active.filter((member) => !member.isOwner && (member.role ?? "MEMBER") === role);
  const loggers = active.filter(canLogIn).length;
  const loginSub = (list: GroupMember[]) => t("{count} can log in", { count: formatCount(list.filter(canLogIn).length, fmt) });

  const tiles: { key: Filter; label: string; count: number; sub: string; icon: typeof Users; cls: string; on: string }[] = [
    { key: "all", label: t("Total members"), count: active.length, sub: t("{count} shares in all", { count: formatCount(totalShares, fmt) }), icon: Users, cls: "bg-mint-50 text-emerald", on: "border-emerald bg-emerald-wash" },
    { key: "ACCOUNTANT", label: t("Editor access"), count: ofRole("ACCOUNTANT").length, sub: loginSub(ofRole("ACCOUNTANT")), icon: Pencil, cls: "bg-warning-soft text-warning", on: "border-warning bg-warning-50" },
    { key: "VIEWER", label: t("Viewer access"), count: ofRole("VIEWER").length, sub: loginSub(ofRole("VIEWER")), icon: Eye, cls: "bg-info-soft text-info", on: "border-info bg-info-50" },
    { key: "MEMBER", label: t("No access"), count: ofRole("MEMBER").length, sub: t("In the costs, no portal"), icon: UserX, cls: "bg-quiet-chip text-ink-muted", on: "border-ink-muted bg-hover" },
  ];

  const words = query.trim().toLowerCase();
  const digits = words.replace(/\D/g, "");
  const pool = filter === "left" ? gone : active.filter((member) => filter === "all" || (!member.isOwner && (member.role ?? "MEMBER") === filter));
  const rows = pool.filter((member) => !words || member.name.toLowerCase().includes(words) || (member.household ?? "").toLowerCase().includes(words) || (!!digits && (member.phone ?? "").replace(/\D/g, "").includes(digits)));

  const access = (member: GroupMember): { title: string; sub: string; dot: string; tone: string } => {
    if (member.status !== "ACTIVE") return { title: t("No access"), sub: t("Left the group"), dot: "bg-input", tone: "text-ink-muted" };
    if (member.isOwner) return { title: t("App owner"), sub: "", dot: "bg-emerald", tone: "text-ink-2" };
    const login = member.access?.login;
    const link = member.access?.link;
    if (login && link) return { title: t("Reset link sent"), sub: t("Can still log in · username {name}", { name: login.username ?? "–" }), dot: "bg-warning-fill", tone: "text-warning" };
    if (login) return { title: t("Can log in"), sub: `@${login.username ?? "–"} · ${login.lastLoginAt ? t("last login {date}", { date: formatDay(login.lastLoginAt.slice(0, 10), "d MMM", fmt) }) : t("not used yet")}`, dot: "bg-success", tone: "text-tint-green-ink" };
    if (link) return { title: t("Access link sent · waiting"), sub: t("Sent {date}", { date: formatDay(link.createdAt.slice(0, 10), "d MMM", fmt) }), dot: "bg-warning-fill", tone: "text-warning" };
    return { title: t("No access"), sub: "", dot: "bg-input", tone: "text-ink-muted" };
  };

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[20px] leading-[1.3] font-semibold tracking-[-0.01em] text-ink">{t("Members & access")}</h2>
        {isAdmin && (
          <button type="button" onClick={onAdd} className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-emerald px-4 text-body font-semibold whitespace-nowrap text-on-action shadow-button hover:bg-emerald-hover">
            <UserPlus className="size-4" strokeWidth={2} aria-hidden="true" />
            {t("Add member")}
          </button>
        )}
      </div>

      <div role="tablist" aria-label={t("Filter by role")} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {tiles.map((tile) => {
          const on = filter === tile.key;
          return (
            <button
              key={tile.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setFilter(on && tile.key !== "all" ? "all" : tile.key)}
              className={cn("flex items-center gap-3.5 overflow-hidden rounded-card border-[1.5px] px-4.5 py-4 text-left", on ? cn(tile.on, "shadow-float") : "border-line-card bg-surface shadow-card")}
            >
              <span aria-hidden="true" className={cn("flex size-11.5 shrink-0 items-center justify-center rounded-[14px] [&_svg]:size-5.5", tile.cls)}>
                <tile.icon strokeWidth={1.9} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[28px] leading-none font-bold tracking-[-0.02em] text-ink tabular-nums">{formatCount(tile.count, fmt)}</span>
                <span className={cn("text-[13px] font-semibold whitespace-nowrap", tile.cls.split(" ")[1])}>{tile.label}</span>
                <span className="truncate text-[11.5px] text-ink-muted">{tile.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      <section aria-label={t("Members & access")} className="flex flex-col overflow-hidden rounded-card border border-line-card bg-surface shadow-card">
        <div className="flex flex-wrap items-center gap-2.5 px-5 py-3">
          <label className="relative w-full md:w-75">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("Search name, phone or who it covers…")} placeholder={t("Search name, phone or who it covers…")} className="h-9.5 w-full rounded-field border border-input bg-surface pr-3 pl-9 text-[13px] text-ink outline-none focus:border-focus-ring focus:focus-halo" />
          </label>
          <span className="flex-1" />
          {(gone.length > 0 || filter === "left") && (
            <button type="button" aria-pressed={filter === "left"} onClick={() => setFilter(filter === "left" ? "all" : "left")} className={cn("h-9 rounded-full border px-3.5 text-[13px] font-semibold text-ink-2", filter === "left" ? "border-emerald bg-emerald-wash" : "border-input bg-surface")}>
              {t("Left the group · {count}", { count: formatCount(gone.length, fmt) })}
            </button>
          )}
        </div>
        <div role="row" className={cn("hidden items-center gap-x-3 border-y border-line bg-table-head px-5 py-2.25 text-caption font-semibold text-ink-muted md:grid", COLUMNS)}>
          <span className="text-center">#</span>
          <span>{t("Member")}</span>
          <span>{t("Phone")}</span>
          <span className="text-center">{t("Shares")}</span>
          <span>{t("Role")}</span>
          <span>{t("Access")}</span>
          <span className="text-right">{t("Balance now")}</span>
          {isAdmin && <span className="text-right">{t("Actions")}</span>}
        </div>
        {rows.map((member, index) => {
          const left = member.status !== "ACTIVE";
          const role = ROLE_CHIP[roleKey(member)];
          const held = cash[member.id] ?? 0;
          const balance = view.balances[member.id] ?? 0;
          const state = access(member);
          const isMe = member.isOwner && isAdmin;
          return (
            <div key={member.id} role="row" className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-divider px-5 py-2 text-body tabular-nums md:min-h-16", COLUMNS, isMe && "shadow-[inset_3px_0_0_var(--color-emerald)]")}>
              <span className="hidden text-center text-[13px] font-bold text-ink-faint md:block">{formatCount(index + 1, fmt)}</span>
              <span className={cn("flex min-w-0 items-center gap-3", left && "opacity-60")}>
                <MemberAvatar member={member} members={data.members} size={36} className="size-9.5 text-[13px]" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-semibold text-ink">{member.name}</span>
                    {isMe && <span className="shrink-0 rounded-full bg-emerald px-1.75 py-px text-[11px] font-bold text-on-action">{t("You")}</span>}
                  </span>
                  {member.household && <span className="truncate text-caption text-ink-muted">{member.household}</span>}
                </span>
              </span>
              <span className={cn("hidden min-w-0 flex-col gap-0.5 md:flex", left && "opacity-60")}>
                <span className="text-[13.5px] whitespace-nowrap text-ink-2">{member.phone ? toLocaleDigits(phoneShow(member.phone), fmt) : "–"}</span>
                <span className="truncate text-[11.5px] text-ink-muted">{left && member.leftOn ? t("Left on {date}", { date: formatDay(member.leftOn.slice(0, 10), "d MMMM yyyy", fmt) }) : t("Since {date}", { date: formatDay((member.joinedOn ?? member.createdAt).slice(0, 10), "d MMMM yyyy", fmt) })}</span>
              </span>
              <span className={cn("hidden text-center font-semibold md:block", left && "opacity-60")}>{formatCount(Number(member.shareUnits), fmt)}</span>
              <span className="hidden min-w-0 flex-col items-start gap-0.75 md:flex">
                <span className={cn("rounded-full px-2.25 py-0.5 text-caption font-semibold whitespace-nowrap", role.cls)}>{t(role.label)}</span>
                {!left && Math.abs(held) >= 0.5 && <span className="text-[11.5px] whitespace-nowrap text-ink-muted">{t("Keeps {amount} cash", { amount: held < 0 ? `− ${money(-held)}` : money(held) })}</span>}
              </span>
              <span className="hidden min-w-0 items-start gap-1.75 md:flex">
                <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", state.dot)} />
                <span className="flex min-w-0 flex-col gap-px">
                  <span className={cn("truncate text-[13px] font-semibold", state.tone)}>{state.title}</span>
                  {state.sub && <span className="truncate text-caption text-ink-muted">{state.sub}</span>}
                </span>
              </span>
              <span className={cn("flex flex-col items-end gap-px", left && "opacity-60")}>
                <span className={cn("font-bold whitespace-nowrap", balance > 0.5 ? "text-tint-green-ink" : balance < -0.5 ? "text-expense" : "text-ink")}>{Math.abs(balance) < 0.5 ? money(0) : formatSignedCurrency(balance, data.currency, fmt)}</span>
                <span className={cn("text-[11.5px] font-semibold whitespace-nowrap", balance > 0.5 ? "text-tint-green-ink" : balance < -0.5 ? "text-expense" : "text-ink")}>{balance > 0.5 ? t("Group owes them") : balance < -0.5 ? t("Owes the group") : t("Settled")}</span>
              </span>
              {isAdmin && (
                <span className="col-span-2 flex justify-end gap-1 md:col-span-1">
                  {!left && (
                    <button type="button" onClick={() => onEdit(member)} aria-label={t("Edit {name}", { name: member.name })} title={t("Edit")} className={ACT}>
                      <Pencil strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                  {!member.isOwner && (
                    <button type="button" onClick={() => onToggleStatus(member)} aria-label={left ? t("Bring {name} back", { name: member.name }) : t("Mark {name} as left the group", { name: member.name })} title={left ? t("Bring back") : t("Left the group")} className={ACT}>
                      {left ? <UserCheck strokeWidth={2} aria-hidden="true" /> : <UserMinus strokeWidth={2} aria-hidden="true" />}
                    </button>
                  )}
                </span>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="px-5 py-7 text-center text-body text-ink-muted">{words ? t("No member matches “{query}”.", { query: query.trim() }) : t("Nobody here yet.")}</p>}
        <div className="flex items-center justify-between gap-3 bg-table-head px-5 py-3 text-[13px] text-ink-soft">
          <span>
            {countLabel(t, fmt, active.length, "{count} member", "{count} members")} · {t("{count} shares in total", { count: formatCount(totalShares, fmt) })} · {t(loggers === 1 ? "{count} member can log in" : "{count} members can log in", { count: formatCount(loggers, fmt) })}
          </span>
        </div>
      </section>
    </div>
  );
}
