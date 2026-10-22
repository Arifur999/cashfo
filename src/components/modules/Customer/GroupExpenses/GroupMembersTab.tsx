"use client";

import { Archive, ArchiveRestore, FileText, Info, MessageCircle, MoreVertical, Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import { ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { GroupMember } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { memberSince, paidIn } from "@/lib/customer/groupDisplay";
import { mealText } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceCell } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupMembersTabProps {
  data: GroupPageData;
  view: GroupView;
  onAdd: () => void;
  onEdit: (member: GroupMember) => void;
  onToggleStatus: (member: GroupMember) => void;
  onRemove: (member: GroupMember) => void;
  onStatement: (member: GroupMember) => void;
}

type Filter = "ACTIVE" | "ARCHIVED" | "ALL";
// Member, paid in, balance and the actions; the phone and the month they
// joined get columns from xl, where there is room (from md to xl they sit
// under the name). A group counting meals adds the meals.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_104px_112px_148px] xl:grid-cols-[minmax(0,1fr)_124px_96px_104px_112px_148px]";
const MEALS_COLUMNS = "md:grid-cols-[minmax(0,1fr)_56px_104px_112px_148px] xl:grid-cols-[minmax(0,1fr)_124px_96px_56px_104px_112px_148px]";

const TIPS = [
  { icon: <UserPlus />, title: "Members don't need a login", body: "You record everything for them. Add a phone to send them their statement." },
  { icon: <MessageCircle />, title: "Statements on WhatsApp", body: "Each member's month, with every share, as a message they can keep." },
  { icon: <Archive />, title: "Archive, don't delete", body: "Someone who leaves keeps their past months. From then on they are left out of every split." },
];

// The members of a group: who is in, their phone, since when, what they
// paid in and where the month leaves them, and a statement for each.
export function GroupMembersTab({ data, view, onAdd, onEdit, onToggleStatus, onRemove, onStatement }: GroupMembersTabProps) {
  const { t, locale } = useLocale();
  const [filter, setFilter] = useState<Filter>("ACTIVE");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const counts = { ACTIVE: data.members.filter((m) => m.status === "ACTIVE").length, ARCHIVED: data.members.filter((m) => m.status === "ARCHIVED").length, ALL: data.members.length };
  const shown = data.members.filter((m) => (filter === "ALL" || m.status === filter) && (!q || m.name.toLowerCase().includes(q) || (m.phone ?? "").includes(q)));
  const archived = data.members.filter((m) => m.status === "ARCHIVED");
  // What they put in this month, own-pocket payments included, as their balance counts it.
  const rowOf = (id: string) => data.settlement.members.find((m) => m.groupMemberId === id);
  const paidInBy = (id: string) => {
    const row = rowOf(id);
    return row ? paidIn(row) : 0;
  };
  const month = monthName(data.range.key, locale);
  const meals = data.settings.kind === "MESS" || data.settings.mealsOn;
  const columns = meals ? MEALS_COLUMNS : COLUMNS;
  const holder = data.settings.cashHolderMemberId;
  const money = (value: number) => formatCurrency(value, data.currency, locale);

  const toolbar = (
    <div className="flex flex-col gap-3 border-b border-line px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
      <SegmentedControl
        label={t("Status")}
        variant="soft"
        value={filter}
        onChange={setFilter}
        options={(["ACTIVE", "ARCHIVED", "ALL"] as Filter[]).map((value) => ({
          value,
          label: (
            <>
              {t(value === "ACTIVE" ? "Active" : value === "ARCHIVED" ? "Archived" : "All")} <span className="text-ink-muted">{formatCount(counts[value], locale)}</span>
            </>
          ),
        }))}
      />
      <div className="flex gap-3">
        <Input size="sm" type="search" value={query} onChange={(event) => setQuery(event.target.value)} leading={<Search />} placeholder={t("Search name or phone…")} aria-label={t("Search members")} frameClassName="min-w-0 flex-1 md:w-60 md:flex-none" />
        <Button variant="secondary" size="sm" onClick={onAdd}>
          <UserPlus />
          {t("Add member")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <ListCard
        label={t("Members")}
        header={toolbar}
        footer={
          archived.length > 0 &&
          filter !== "ARCHIVED" && (
            <div className="flex items-start gap-3 border-t border-line bg-strip px-4 py-3 text-small text-ink-2 md:px-6">
              <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span>
                {fillNodes(t(archived.length === 1 ? "{names} is archived. Their past months still count; from now on they are left out of every split." : "{names} are archived. Their past months still count; from now on they are left out of every split."), {
                  names: <b className="font-semibold text-ink">{archived.map((m) => m.name).join(", ")}</b>,
                })}
              </span>
            </div>
          )
        }
      >
        <ListHead columns={columns}>
          <ListHeadCell>{t("Member")}</ListHeadCell>
          <ListHeadCell className="hidden xl:block">{t("Phone")}</ListHeadCell>
          <ListHeadCell className="hidden xl:block">{t("Member since")}</ListHeadCell>
          {meals && <ListHeadCell align="end">{t("Meals")}</ListHeadCell>}
          <ListHeadCell align="end">{t("Paid in")}</ListHeadCell>
          <ListHeadCell align="end">{t("{month} balance", { month })}</ListHeadCell>
          <ListHeadCell align="end">{t("Actions")}</ListHeadCell>
        </ListHead>
        {shown.length === 0 && <ListEmpty icon={<Users />} tone="neutral" title={data.members.length === 0 ? t("No member yet. Add the people who share the costs.") : t("No member matches.")} />}
        {shown.map((member) => {
          const active = member.status === "ACTIVE";
          const balance = view.balances[member.id] ?? 0;
          return (
            <ListRow key={member.id} columns={columns} density="relaxed" className="tabular-nums">
              <ListCell className="flex items-center gap-3">
                {/* Only the person is set back: their buttons still work. */}
                <PersonAvatar name={member.name} src={member.photoUrl} size={36} coloured className={cn(!active && "opacity-60")} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={cn("truncate font-semibold", active ? "text-ink" : "text-ink-muted")}>{member.name}</span>
                  <span className="truncate text-caption font-normal text-ink-muted">{!active ? t("Archived") : member.id === holder ? t("Manager · keeps the cash") : t("Active member")}</span>
                  {/* The phone and joining month, whose columns start at xl. */}
                  <span className="hidden truncate text-caption font-normal text-ink-muted md:block xl:hidden">{[member.phone, t("Member since {month}", { month: monthName(memberSince(member), locale, "short", true) })].filter(Boolean).join(" · ")}</span>
                  {/* The month's figures, which have no columns on a phone. */}
                  <span className="truncate text-caption font-normal text-ink-2 md:hidden">{t("{paid} paid in · {balance}", { paid: money(paidInBy(member.id)), balance: formatSignedCurrency(balance, data.currency, locale) })}</span>
                </span>
              </ListCell>
              <ListCell className="hidden text-ink-2 xl:block">{member.phone ?? "—"}</ListCell>
              <ListCell className="hidden text-ink-2 xl:block">{monthName(memberSince(member), locale, "short", true)}</ListCell>
              {meals && (
                <ListCell align="end" className="hidden text-ink md:block">
                  {mealText(Number(rowOf(member.id)?.mealUnits ?? 0), locale)}
                </ListCell>
              )}
              <ListCell align="end" className="hidden text-ink md:block">
                {money(paidInBy(member.id))}
              </ListCell>
              <ListCell className="hidden md:block">
                <BalanceCell stacked value={balance} currency={data.currency} />
              </ListCell>
              <ListRowActions>
                <Button variant="outline" size="sm" onClick={() => onStatement(member)} aria-label={t("{name}'s statement", { name: member.name })} className="h-8 gap-1 px-3 text-small pointer-coarse:h-11">
                  <FileText className="size-4" />
                  {t("Statement")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label={t("More actions for {name}", { name: member.name })} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
                    <MoreVertical className="size-4.5" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                    <DropdownMenuItem onSelect={() => onEdit(member)} className="rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken">
                      <Pencil className="size-4" aria-hidden="true" />
                      {t("Edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onToggleStatus(member)} className="rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken">
                      {active ? <Archive className="size-4" aria-hidden="true" /> : <ArchiveRestore className="size-4" aria-hidden="true" />}
                      {t(active ? "Archive" : "Bring back")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onRemove(member)} className="rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
                      <Trash2 className="size-4" aria-hidden="true" />
                      {t("Remove")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ListRowActions>
            </ListRow>
          );
        })}
      </ListCard>

      <div className="grid gap-4 md:grid-cols-3">
        {TIPS.map((tip) => (
          <Card key={tip.title} padding="none" className="flex gap-3 p-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-mint-50 text-emerald [&_svg]:size-4">{tip.icon}</span>
            <div className="flex flex-col gap-0.75">
              <span className="text-body font-semibold text-ink">{t(tip.title)}</span>
              <span className="text-small leading-relaxed text-ink-muted">{t(tip.body)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
