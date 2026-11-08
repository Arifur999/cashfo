"use client";

import { ChevronLeft, ChevronRight, Eye, FileText, KeyRound, Pencil, PencilLine, PieChart, Search, Trash2, TriangleAlert, UserCheck, UserMinus, UserPlus, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Chip, { type ChipTone } from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { GroupAccessLink, GroupMember } from "@/lib/customer/api";
import { MEMBER_ROLE_HINTS, MEMBER_ROLE_LABELS, memberAccessRole, type MemberAccessRole } from "@/lib/customer/groupAccess";
import { groupTabHref, memberSince } from "@/lib/customer/groupDisplay";
import { addsUpToHundred, costShares, isAccountant } from "@/lib/customer/groupFamily";
import { formatCurrency } from "@/lib/customer/currency";
import { monthName } from "@/lib/customer/insights";
import { formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { type AccessLinkShown, AccessLinkDialog } from "./AccessLinkDialog";
import { BalanceCell, MemberAvatar } from "./GroupBits";
import { MemberAccessDialog } from "./MemberAccessDialog";
import type { GroupPageData, GroupView } from "./groupTypes";

type Filter = "ACTIVE" | "ARCHIVED" | "ALL";

interface GroupMembersTabProps {
  data: GroupPageData;
  view: GroupView;
  // Changing members is the group's owner's: absent for everyone else,
  // who see the list and each statement.
  onAdd?: () => void;
  onEdit?: (member: GroupMember) => void;
  // Mark inactive (asks first) or make active again.
  onToggleStatus?: (member: GroupMember) => void;
  onRemove?: (member: GroupMember) => void;
  onStatement: (member: GroupMember) => void;
  onCostSplit?: () => void;
}

const ROLE_TONES: Record<MemberAccessRole, ChipTone> = { ADMIN: "mint", EDITOR: "warning", VIEWER: "info", NONE: "neutral" };

// #, member, phone (and since when), shares, role, login, balance now, actions
// (the v16 FamilyMembers board), ten to a page.
const COLUMNS = "md:grid-cols-[34px_minmax(0,1fr)_124px_56px_112px_200px_124px_168px]";
const PER_PAGE = 10;

// The group's people (the v7 FamilyMembers board): who is in, their role
// -- accountants keep the cash -- and their part of the costs, with the
// cost split, each one's statement, and marking someone inactive from next
// month (or deleting one added by mistake).
export function GroupMembersTab({ data, view, onAdd, onEdit, onToggleStatus, onRemove, onStatement, onCostSplit }: GroupMembersTabProps) {
  const { t, fmt } = useLocale();
  const [filter, setFilter] = useState<Filter>("ACTIVE");
  const [query, setQuery] = useState("");
  const shares = costShares(data.members, data.settings);
  const custom = data.settings.costSplit === "CUSTOM";
  const active = view.activeMembers;
  const counts: Record<Filter, number> = { ACTIVE: active.length, ARCHIVED: data.members.length - active.length, ALL: data.members.length };
  const words = query.trim().toLowerCase();
  // The role tiles (the FamilyMembers board): everyone active, then by
  // access; a tile filters the table to its people (again for all).
  const [roleFilter, setRoleFilter] = useState<"ALL" | MemberAccessRole>("ALL");
  const byRole = (role: MemberAccessRole) => active.filter((member) => memberAccessRole(member) === role);
  const loggedIn = (role: MemberAccessRole) => byRole(role).filter((member) => member.access?.login).length;
  const tiles: { key: "ALL" | MemberAccessRole; label: string; count: number; sub: string; tone: string; icon: React.ElementType }[] = [
    { key: "ALL", label: t("Total members"), count: active.length, sub: t("Cost split · {mode}", { mode: t(custom ? "Custom %" : "Equal") }), tone: "bg-mint-50 text-emerald", icon: Users },
    { key: "EDITOR", label: t("Editor access"), count: byRole("EDITOR").length, sub: onEdit ? t("{count} can log in", { count: formatCount(loggedIn("EDITOR"), fmt) }) : t("Keep group cash"), tone: "bg-warning-soft text-warning", icon: PencilLine },
    { key: "VIEWER", label: t("Viewer access"), count: byRole("VIEWER").length, sub: onEdit ? t("{count} can log in", { count: formatCount(loggedIn("VIEWER"), fmt) }) : t("See everything"), tone: "bg-info-soft text-info", icon: Eye },
    { key: "NONE", label: t("No access"), count: byRole("NONE").length, sub: t("In the costs, no portal"), tone: "bg-surface-sunken text-ink-soft", icon: UserRound },
  ];
  const [pageAsked, setPage] = useState(1);
  const shown = data.members.filter((member) => (roleFilter === "ALL" || memberAccessRole(member) === roleFilter) && (filter === "ALL" || member.status === filter) && (!words || member.name.toLowerCase().includes(words) || (member.household ?? "").toLowerCase().includes(words) || (member.phone ?? "").replace(/\D/g, "").includes(words.replace(/\D/g, "") || "\u0000")));
  // Ten to a page; a filter that leaves fewer pages lands on the last.
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const page = Math.min(pageAsked, pages);
  const from = (page - 1) * PER_PAGE;
  const rows = shown.slice(from, from + PER_PAGE);
  const totalShares = active.reduce((sum, member) => sum + Number(member.shareUnits || 1), 0);
  const logins = active.filter((member) => member.access?.login).length;
  const cashOf = Object.fromEntries((data.settlement.accountantCash ?? []).map((row) => [row.groupMemberId, Number(row.cash)]));
  const broken = custom && active.length > 0 && !addsUpToHundred(active.map((member) => shares[member.id] ?? 0));
  const unshared = custom ? active.filter((member) => !(shares[member.id] > 0)) : [];
  const filterWord = filter === "ACTIVE" ? t("active") : filter === "ARCHIVED" ? t("inactive") : t("all");
  // Members & access (the owner's): the access popup, and a link to send.
  const [accessFor, setAccessFor] = useState<string | null>(null);
  const [linkShown, setLinkShown] = useState<AccessLinkShown | null>(null);
  const accessMember = accessFor ? (data.members.find((member) => member.id === accessFor) ?? null) : null;
  const showLink = (member: GroupMember, link: GroupAccessLink) => {
    setAccessFor(null);
    setLinkShown({ link, name: member.name, phone: member.phone, roleLabel: t(MEMBER_ROLE_LABELS[memberAccessRole(member)]), groupName: data.name });
  };
  const day = (iso: string) => formatDay(iso.slice(0, 10), "d MMM", fmt);
  // A member's login, in a few words, with its dot.
  const accessLine = (member: GroupMember): { text: string; tone: string } | null => {
    if (member.isOwner || !member.access) return null;
    const { login, link } = member.access;
    if (member.role === "MEMBER" || !member.role) return { text: t("No portal, no link"), tone: "bg-line-strong" };
    if (login) return { text: login.lastLoginAt ? t("Can log in · last login {date}", { date: day(login.lastLoginAt) }) : t("Can log in"), tone: "bg-income" };
    if (link) return { text: t("Link sent {date} · waiting", { date: day(link.createdAt) }), tone: "bg-warning" };
    return { text: t("No login yet"), tone: "bg-line-strong" };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[19px] font-semibold text-ink">{t("Members")}</h2>
        <p className="text-small text-ink-muted">{t("Who is in the group, each person’s share of the costs and where their balance stands.")}</p>
      </div>
      {broken && (
        <Banner tone="warning" icon={<TriangleAlert />}>
          <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span>{unshared.length > 0 ? t("The cost split doesn't add up to 100%: {names} have no share yet.", { names: unshared.map((member) => member.name).join(", ") }) : t("The cost split doesn't add up to 100%.")}</span>
            {onCostSplit && (
              <button type="button" onClick={onCostSplit} className="font-semibold text-warning-ink underline underline-offset-2">
                {t("Fix the cost split")}
              </button>
            )}
          </span>
        </Banner>
      )}

      <div role="group" aria-label={t("Filter by role")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => {
          const on = roleFilter === tile.key;
          return (
            <button
              key={tile.key}
              type="button"
              aria-pressed={on}
              onClick={() => setRoleFilter(on && tile.key !== "ALL" ? "ALL" : tile.key)}
              className={cn("flex items-center gap-3.5 rounded-[18px] border-[1.5px] px-4.5 py-4 text-left shadow-card transition-colors", on ? "border-emerald bg-mint-50/50" : "border-line-card bg-surface hover:border-mint-200")}
            >
              <span aria-hidden="true" className={cn("flex size-11.5 shrink-0 items-center justify-center rounded-[14px] [&_svg]:size-5.5", tile.tone)}>
                <tile.icon strokeWidth={2} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[28px] leading-none font-bold tracking-[-0.02em] text-ink tabular-nums">{formatCount(tile.count, fmt)}</span>
                <span className="truncate text-[13px] font-semibold text-ink-2">{tile.label}</span>
                <span className="truncate text-[11.5px] text-ink-muted">{tile.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      <ListCard
        label={t("Members")}
        header={
          <div className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:justify-between md:px-5">
            <SegmentedControl
              label={t("Status")}
              variant="tabs"
              className="rounded-full p-1"
              value={filter}
              onChange={setFilter}
              options={(["ACTIVE", "ARCHIVED", "ALL"] as Filter[]).map((value) => ({
                value,
                label: (
                  <>
                    {t(value === "ACTIVE" ? "Active" : value === "ARCHIVED" ? "Inactive" : "All")} <span className="font-normal text-ink-faint">{formatCount(counts[value], fmt)}</span>
                  </>
                ),
              }))}
            />
            <div className="flex flex-wrap gap-2.5">
              <Input size="sm" type="search" value={query} onChange={(event) => setQuery(event.target.value)} leading={<Search />} placeholder={t("Search name, phone or who it covers…")} aria-label={t("Search members")} frameClassName="min-w-0 flex-1 md:w-60 md:flex-none" />
              {onCostSplit && (
                <Button variant="secondary" size="sm" onClick={onCostSplit} className="h-9.5 [&_svg]:text-ink-soft">
                  <PieChart />
                  {t("Cost split · {mode}", { mode: t(custom ? "Custom %" : "Equal") })}
                </Button>
              )}
              {onAdd && (
                <Button size="sm" onClick={onAdd} className="h-9.5">
                  <UserPlus />
                  {t("Add member")}
                </Button>
              )}
            </div>
          </div>
        }
        footer={
          <ListFooter className="flex-col items-start gap-1 text-small text-ink-soft md:px-5">
            <span className="flex w-full flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink-2">
                {onEdit
                  ? t("{count} members · {shares} shares in total · {logins} can log in", { count: formatCount(active.length, fmt), shares: formatCount(totalShares, fmt), logins: formatCount(logins, fmt) })
                  : t("{count} members · {shares} shares in total", { count: formatCount(active.length, fmt), shares: formatCount(totalShares, fmt) })}
              </span>
              {shown.length > PER_PAGE && (
                <span className="flex items-center gap-2.5">
                  <span className="text-ink-muted">{t("{from} to {to} of {total}", { from: formatCount(from + 1, fmt), to: formatCount(from + rows.length, fmt), total: formatCount(shown.length, fmt) })}</span>
                  <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label={t("Previous page")} className="flex size-8 items-center justify-center rounded-full border border-line bg-surface text-ink-2 disabled:opacity-40 pointer-coarse:size-11">
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => setPage(page + 1)} disabled={page >= pages} aria-label={t("Next page")} className="flex size-8 items-center justify-center rounded-full border border-line bg-surface text-ink-2 disabled:opacity-40 pointer-coarse:size-11">
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                </span>
              )}
            </span>
            <span>{t("Balance now: above 0 the group owes them, below 0 they owe the group. Members with money entries can’t be deleted; mark them inactive and they stay in the history.")}</span>
          </ListFooter>
        }
      >
        <ListHead columns={COLUMNS} className="gap-x-3 border-t md:px-5">
          <ListHeadCell align="center">#</ListHeadCell>
          <ListHeadCell>{t("Member")}</ListHeadCell>
          <ListHeadCell>{t("Phone")}</ListHeadCell>
          <ListHeadCell align="center">{t("Shares")}</ListHeadCell>
          <ListHeadCell>{t("Role")}</ListHeadCell>
          <ListHeadCell>{t("Login")}</ListHeadCell>
          <ListHeadCell align="end">{t("Balance now")}</ListHeadCell>
          <ListHeadCell align="end">{t("Actions")}</ListHeadCell>
        </ListHead>
        {rows.length === 0 && <ListEmpty title={words ? t("No member matches \"{query}\".", { query: query.trim() }) : t("No {filter} members.", { filter: filterWord })} />}
        {rows.map((member, index) => {
          const inactive = member.status !== "ACTIVE";
          const share = shares[member.id];
          const accountant = isAccountant(member);
          const accessRole = memberAccessRole(member);
          const line = accessLine(member);
          return (
            <ListRow key={member.id} columns={COLUMNS} className={cn("min-h-16 grid-cols-[minmax(0,1fr)_auto] gap-x-3 tabular-nums md:px-5 md:py-2", inactive && "opacity-60")}>
              <ListCell className="hidden text-center text-[13px] font-bold text-ink-faint md:block">{formatCount(from + index + 1, fmt)}</ListCell>
              <ListCell className="flex items-center gap-3">
                <MemberAvatar member={member} members={data.members} size={36} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="truncate font-semibold text-ink">{member.name}</span>
                    {member.id === data.access.selfMemberId && (
                      <Chip tone="forest" size="sm">
                        {t("You")}
                      </Chip>
                    )}
                    {inactive && (
                      <Chip tone="neutral" size="sm">
                        {t("Inactive")}
                      </Chip>
                    )}
                  </span>
                  <span className="truncate text-caption text-ink-muted">{[member.household, accountant ? t("Keeps the family cash") : t("Gives money to the accountant")].filter(Boolean).join(" · ")}</span>
                </span>
              </ListCell>
              <ListCell className="hidden min-w-0 flex-col gap-0.5 md:flex">
                <span className="truncate text-[13.5px] text-ink-2">{member.phone || "—"}</span>
                <span className="truncate text-[11.5px] text-ink-muted">{t("Since {month}", { month: monthName(memberSince(member), fmt, "short", true) })}</span>
              </ListCell>
              <ListCell className="hidden flex-col items-center gap-0.5 md:flex" title={share === undefined ? undefined : t("{percent} of the costs shared by shares", { percent: `${formatCount(Math.round(share * 10) / 10, fmt)}%` })}>
                <span className="font-semibold text-ink">{formatCount(Number(member.shareUnits || 1), fmt)}</span>
                {!inactive && share !== undefined && custom && <span className="text-[11px] text-ink-muted">{formatCount(Math.round(share * 10) / 10, fmt)}%</span>}
              </ListCell>
              <ListCell className="hidden min-w-0 flex-col items-start gap-0.75 md:flex">
                {accountant ? (
                  <Link href={groupTabHref(data.businessId, "cashbook", { accountant: member.id })} title={t("Open cash book")} className="rounded-full">
                    <Chip tone={ROLE_TONES[accessRole]} size="sm" title={t(MEMBER_ROLE_HINTS[accessRole])}>
                      {t(MEMBER_ROLE_LABELS[accessRole])}
                    </Chip>
                  </Link>
                ) : (
                  <Chip tone={ROLE_TONES[accessRole]} size="sm" title={t(MEMBER_ROLE_HINTS[accessRole])}>
                    {t(MEMBER_ROLE_LABELS[accessRole])}
                  </Chip>
                )}
                {accountant && cashOf[member.id] !== undefined && <span className="text-[11.5px] whitespace-nowrap text-ink-muted">{t("Holds {amount}", { amount: formatCurrency(cashOf[member.id], data.currency, fmt) })}</span>}
              </ListCell>
              <ListCell className="hidden min-w-0 items-start gap-1.75 md:flex" title={t(MEMBER_ROLE_HINTS[accessRole])}>
                {line ? (
                  <>
                    <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", line.tone)} />
                    <span className="flex min-w-0 flex-col gap-px">
                      <span className="truncate text-[13px] font-semibold text-ink-2">{line.text}</span>
                      {member.access?.login && <span className="truncate text-[12px] text-ink-muted">{member.access.login.ownAccount ? t("Their own Smartly account") : t("username {name}", { name: member.access.login.username ?? "" })}</span>}
                    </span>
                  </>
                ) : (
                  <span className="truncate text-[12.5px] text-ink-muted">{member.isOwner ? t("Your app login") : t(MEMBER_ROLE_HINTS[accessRole])}</span>
                )}
              </ListCell>
              <ListCell className="hidden md:block">
                {view.balances[member.id] === undefined ? <span className="block text-right text-input">—</span> : <BalanceCell value={view.balances[member.id]} currency={data.currency} stacked />}
              </ListCell>
              <ListRowActions className="flex justify-end gap-0.5">
                <IconAction label={t("{name}'s statement", { name: member.name })} onClick={() => onStatement(member)}>
                  <FileText />
                </IconAction>
                {onEdit && (
                  <IconAction label={t("Edit {name}", { name: member.name })} onClick={() => onEdit(member)}>
                    <Pencil />
                  </IconAction>
                )}
                {onEdit && !member.isOwner && !inactive && (
                  <IconAction label={t("Access for {name}", { name: member.name })} onClick={() => setAccessFor(member.id)}>
                    <KeyRound />
                  </IconAction>
                )}
                {onToggleStatus && !member.isOwner && (
                  <IconAction label={inactive ? t("Make active {name}", { name: member.name }) : t("Mark inactive {name}", { name: member.name })} onClick={() => onToggleStatus(member)}>
                    {inactive ? <UserCheck /> : <UserMinus />}
                  </IconAction>
                )}
                {onRemove && !member.isOwner && (
                  <IconAction label={t("Delete {name}", { name: member.name })} onClick={() => onRemove(member)} danger>
                    <Trash2 />
                  </IconAction>
                )}
              </ListRowActions>
            </ListRow>
          );
        })}
      </ListCard>
      {onEdit && (
        <>
          <MemberAccessDialog
            member={accessMember}
            onClose={() => setAccessFor(null)}
            businessId={data.businessId}
            onLink={showLink}
            onEditMember={(member) => {
              setAccessFor(null);
              onEdit(member);
            }}
          />
          <AccessLinkDialog shown={linkShown} onClose={() => setLinkShown(null)} />
        </>
      )}
    </div>
  );
}

function IconAction({ label, onClick, danger = false, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cn("flex size-8 items-center justify-center rounded-full text-ink-muted pointer-coarse:size-11 [&_svg]:size-4", danger ? "hover:bg-expense-soft hover:text-expense" : "hover:bg-surface-sunken hover:text-ink")}>
      {children}
    </button>
  );
}
