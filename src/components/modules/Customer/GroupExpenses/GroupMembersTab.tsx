"use client";

import { FileText, Pencil, PieChart, Search, Trash2, TriangleAlert, UserCheck, UserMinus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { GroupMember } from "@/lib/customer/api";
import { groupTabHref, memberSince } from "@/lib/customer/groupDisplay";
import { accountantsOf, addsUpToHundred, costShares, isAccountant } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";

type Filter = "ACTIVE" | "ARCHIVED" | "ALL";

interface GroupMembersTabProps {
  data: GroupPageData;
  view: GroupView;
  onAdd: () => void;
  onEdit: (member: GroupMember) => void;
  // Mark inactive (asks first) or make active again.
  onToggleStatus: (member: GroupMember) => void;
  onRemove: (member: GroupMember) => void;
  onStatement: (member: GroupMember) => void;
  onCostSplit: () => void;
}

// Member, phone, member since, cost share, actions.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_140px_120px_200px_152px]";

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
  const accountants = accountantsOf(data.members);
  const counts: Record<Filter, number> = { ACTIVE: active.length, ARCHIVED: data.members.length - active.length, ALL: data.members.length };
  const words = query.trim().toLowerCase();
  const rows = data.members.filter((member) => (filter === "ALL" || member.status === filter) && (!words || member.name.toLowerCase().includes(words) || (member.phone ?? "").replace(/\D/g, "").includes(words.replace(/\D/g, "") || "\u0000")));
  const broken = custom && active.length > 0 && !addsUpToHundred(active.map((member) => shares[member.id] ?? 0));
  const unshared = custom ? active.filter((member) => !(shares[member.id] > 0)) : [];
  const filterWord = filter === "ACTIVE" ? t("active") : filter === "ARCHIVED" ? t("inactive") : t("all");

  return (
    <div className="flex flex-col gap-4">
      {broken && (
        <Banner tone="warning" icon={<TriangleAlert />}>
          <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span>{unshared.length > 0 ? t("The cost split doesn't add up to 100%: {names} have no share yet.", { names: unshared.map((member) => member.name).join(", ") }) : t("The cost split doesn't add up to 100%.")}</span>
            <button type="button" onClick={onCostSplit} className="font-semibold text-warning-ink underline underline-offset-2">
              {t("Fix the cost split")}
            </button>
          </span>
        </Banner>
      )}

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
              <Input size="sm" type="search" value={query} onChange={(event) => setQuery(event.target.value)} leading={<Search />} placeholder={t("Search name or phone…")} aria-label={t("Search members")} frameClassName="min-w-0 flex-1 md:w-60 md:flex-none" />
              <Button variant="secondary" size="sm" onClick={onCostSplit} className="h-9.5 [&_svg]:text-ink-soft">
                <PieChart />
                {t("Cost split · {mode}", { mode: t(custom ? "Custom %" : "Equal") })}
              </Button>
              <Button size="sm" onClick={onAdd} className="h-9.5">
                <UserPlus />
                {t("Add member")}
              </Button>
            </div>
          </div>
        }
        footer={
          <ListFooter className="flex-col items-start gap-1 text-small text-ink-soft md:px-5">
            <span className="font-semibold text-ink-2">{t("{active} active members · {accountants} accountants", { active: formatCount(active.length, fmt), accountants: formatCount(accountants.length, fmt) })}</span>
            <span>{t("Members with records can't be deleted. Mark them inactive to leave them out from the next month.")}</span>
          </ListFooter>
        }
      >
        <ListHead columns={COLUMNS} className="gap-x-3 border-t md:px-5">
          <ListHeadCell>{t("Member")}</ListHeadCell>
          <ListHeadCell>{t("Phone")}</ListHeadCell>
          <ListHeadCell>{t("Member since")}</ListHeadCell>
          <ListHeadCell>{t("Cost share")}</ListHeadCell>
          <ListHeadCell align="end">{t("Actions")}</ListHeadCell>
        </ListHead>
        {rows.length === 0 && <ListEmpty title={words ? t("No member matches \"{query}\".", { query: query.trim() }) : t("No {filter} members.", { filter: filterWord })} />}
        {rows.map((member) => {
          const inactive = member.status !== "ACTIVE";
          const share = shares[member.id];
          const accountant = isAccountant(member);
          return (
            <ListRow key={member.id} columns={COLUMNS} className={cn("min-h-14 grid-cols-[minmax(0,1fr)_auto] gap-x-3 tabular-nums md:px-5 md:py-1.5", inactive && "opacity-60")}>
              <ListCell className="flex items-center gap-3">
                <MemberAvatar member={member} members={data.members} size={36} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="truncate font-semibold text-ink">{member.name}</span>
                    {member.isOwner && (
                      <Chip tone="neutral" size="sm">
                        {t("Owner")}
                      </Chip>
                    )}
                    {accountant && (
                      <Link href={groupTabHref(data.businessId, "cashbook", { accountant: member.id })} title={t("Open cash book")} className="rounded-full">
                        <Chip tone="mint" size="sm">
                          {t("Accountant")}
                        </Chip>
                      </Link>
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
              <ListCell className="hidden text-ink-2 md:block">{member.phone || "—"}</ListCell>
              <ListCell className="hidden text-ink-2 md:block">{monthName(memberSince(member), fmt, "short", true)}</ListCell>
              <ListCell className="hidden items-center gap-2.5 md:flex">
                {inactive || share === undefined ? (
                  <span className="text-input">—</span>
                ) : (
                  <>
                    <span className="w-12 font-semibold text-ink">{formatCount(Math.round(share * 10) / 10, fmt)}%</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                      <span className="block h-full rounded-full bg-emerald" style={{ width: `${Math.min(100, share)}%` }} />
                    </span>
                  </>
                )}
              </ListCell>
              <ListRowActions className="flex justify-end gap-0.5">
                <IconAction label={t("{name}'s statement", { name: member.name })} onClick={() => onStatement(member)}>
                  <FileText />
                </IconAction>
                <IconAction label={t("Edit {name}", { name: member.name })} onClick={() => onEdit(member)}>
                  <Pencil />
                </IconAction>
                {!member.isOwner && (
                  <IconAction label={inactive ? t("Make active {name}", { name: member.name }) : t("Mark inactive {name}", { name: member.name })} onClick={() => onToggleStatus(member)}>
                    {inactive ? <UserCheck /> : <UserMinus />}
                  </IconAction>
                )}
                {!member.isOwner && (
                  <IconAction label={t("Delete {name}", { name: member.name })} onClick={() => onRemove(member)} danger>
                    <Trash2 />
                  </IconAction>
                )}
              </ListRowActions>
            </ListRow>
          );
        })}
      </ListCard>
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
