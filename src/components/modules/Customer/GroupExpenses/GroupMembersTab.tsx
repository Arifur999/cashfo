"use client";

import { Archive, ArchiveRestore, CalendarDays, FileText, MessageCircle, MoreHorizontal, Pencil, Search, Trash2, UserPlus, Users, Wallet } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import { ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { GroupMember } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { dayLabel, memberSince, paidIn, shiftMonth, shortName } from "@/lib/customer/groupDisplay";
import { mealText } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceCell, MemberAvatar } from "./GroupBits";
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
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_100px_176px_120px] xl:grid-cols-[minmax(0,1fr)_124px_100px_100px_176px_120px]";
const MEALS_COLUMNS = "md:grid-cols-[minmax(0,1fr)_64px_100px_176px_120px] xl:grid-cols-[minmax(0,1fr)_124px_100px_64px_100px_176px_120px]";

const TIPS = [
  { icon: <CalendarDays />, title: "Joining mid-month", body: "A member who joins on the 15th only shares costs from the 15th. Earlier bills are not split onto them." },
  { icon: <Wallet />, title: "Manager holds the cash", body: "Cash in hand is shown against the manager, so everyone can see how much should be with them." },
  { icon: <MessageCircle />, title: "Statements on WhatsApp", body: "Send any member their month in one tap. It uses the phone number saved here." },
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

  const mess = data.settings.kind === "MESS";
  // Since when: the day for someone who joined lately, else the month.
  const since = (member: GroupMember) => (member.joinedOn && member.joinedOn.slice(0, 7) >= shiftMonth(data.range.key, -2) ? dayLabel(member.joinedOn, locale, true) : monthName(memberSince(member), locale, "short", true));
  // One archived member who left on a day: when, and what still counts.
  const gone = archived.length === 1 && archived[0].leftOn ? archived[0] : null;
  const goneMonth = gone?.leftOn ? gone.leftOn.slice(0, 7) : "";

  const toolbar = (
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
              {t(value === "ACTIVE" ? "Active" : value === "ARCHIVED" ? "Archived" : "All")} <span className="font-normal text-ink-faint">{formatCount(counts[value], locale)}</span>
            </>
          ),
        }))}
      />
      <div className="flex gap-2.5">
        <Input size="sm" type="search" value={query} onChange={(event) => setQuery(event.target.value)} leading={<Search />} placeholder={t("Search name or phone…")} aria-label={t("Search members")} frameClassName="min-w-0 flex-1 md:w-60 md:flex-none" />
        <Button variant="secondary" size="sm" onClick={onAdd} className="h-9.5 text-body [&_svg]:text-ink-soft">
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
            <div className="flex items-start gap-2.5 bg-strip px-4 py-3 text-small text-ink-soft md:px-5">
              <Archive className="mt-0.5 size-3.75 shrink-0 text-ink-muted" aria-hidden="true" />
              <span>
                {gone ? fillNodes(t("{name} left on {day} and is archived. Their {month} entries still count in {month}'s settlement; from {next} they are left out of every split."), {
                  name: <b className="font-semibold text-ink">{shortName(gone.name)}</b>,
                  day: dayLabel(gone.leftOn ?? "", locale, true),
                  month: monthName(goneMonth, locale),
                  next: monthName(shiftMonth(goneMonth, 1), locale),
                }) : fillNodes(t(archived.length === 1 ? "{names} is archived. Their past months still count; from now on they are left out of every split." : "{names} are archived. Their past months still count; from now on they are left out of every split."), {
                  names: <b className="font-semibold text-ink">{archived.map((m) => m.name).join(", ")}</b>,
                })}
              </span>
            </div>
          )
        }
      >
        <ListHead columns={columns} className="gap-x-3.5 border-t md:px-5">
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
            <ListRow key={member.id} columns={columns} className="min-h-15.5 gap-x-3.5 tabular-nums md:px-5">
              <ListCell className="flex items-center gap-3">
                {/* Only the person is set back: their buttons still work. */}
                <MemberAvatar member={member} members={data.members} size={36} className={cn("size-9.5 text-[13px]", !active && "opacity-60")} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className={cn("truncate font-semibold", active ? "text-ink" : "text-ink-muted")}>{member.name}</span>
                    {active && member.id === holder && (
                      <Chip tone="neutral" size="sm" className="gap-1 text-ink-soft">
                        <Wallet className="size-2.75" strokeWidth={2.5} aria-hidden="true" />
                        {t("Manager")}
                      </Chip>
                    )}
                  </span>
                  <span className="truncate text-caption font-normal text-ink-muted">
                    {!active
                      ? t("Archived")
                      : Number(rowOf(member.id)?.pocketPaid ?? 0) > 0
                        ? t(mess ? "Paid {amount} bazar from own pocket" : "Paid {amount} from own pocket", { amount: money(Number(rowOf(member.id)?.pocketPaid)) })
                        : member.id === holder
                          ? t(mess ? "Runs the mess this month" : "Keeps the cash")
                          : t("Active member")}
                  </span>
                  {/* The phone and joining month, whose columns start at xl. */}
                  <span className="hidden truncate text-caption font-normal text-ink-muted md:block xl:hidden">{[member.phone, t("Member since {month}", { month: since(member) })].filter(Boolean).join(" · ")}</span>
                  {/* The month's figures, which have no columns on a phone. */}
                  <span className="truncate text-caption font-normal text-ink-2 md:hidden">{t("{paid} paid in · {balance}", { paid: money(paidInBy(member.id)), balance: formatSignedCurrency(balance, data.currency, locale) })}</span>
                </span>
              </ListCell>
              <ListCell className="hidden text-ink-2 xl:block">{member.phone ?? "—"}</ListCell>
              <ListCell className="hidden text-ink-2 xl:block">{since(member)}</ListCell>
              {meals && (
                <ListCell align="end" className="hidden text-ink md:block">
                  {mealText(Number(rowOf(member.id)?.mealUnits ?? 0), locale)}
                </ListCell>
              )}
              <ListCell align="end" className="hidden text-ink md:block">
                {money(paidInBy(member.id))}
              </ListCell>
              <ListCell className="hidden md:block">
                <BalanceCell value={balance} currency={data.currency} />
              </ListCell>
              <ListRowActions>
                <Button variant="outline" size="sm" onClick={() => onStatement(member)} aria-label={t("{name}'s statement", { name: member.name })} className="h-8 gap-1.25 px-2.5 text-[12.5px] text-ink pointer-coarse:h-11">
                  <FileText className="size-3.25 text-ink-soft" />
                  {t("Statement")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label={t("More actions for {name}", { name: member.name })} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
                    <MoreHorizontal className="size-4" strokeWidth={2.5} aria-hidden="true" />
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
          <Card key={tip.title} padding="none" className="flex gap-3 px-4 py-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-mint-50 text-emerald [&_svg]:size-4">{tip.icon}</span>
            <div className="flex flex-col gap-0.75">
              <span className="text-body font-semibold text-ink">{t(tip.title)}</span>
              <span className="text-[12.5px] leading-normal text-ink-muted">{t(tip.body)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
