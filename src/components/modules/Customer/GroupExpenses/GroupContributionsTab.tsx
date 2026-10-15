"use client";

import { Calendar, Lock, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { GroupContribution } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { contributionsByMember, contributionTotals } from "@/lib/customer/groupDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { Figure } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupContributionsTabProps {
  data: GroupPageData;
  view: GroupView;
  onAdd: () => void;
  onEdit: (row: GroupContribution) => void;
  onRemove: (row: GroupContribution) => void;
}

type Kind = "all" | "deposit" | "return";
const ROW = "md:grid-cols-[90px_minmax(0,1fr)_130px_minmax(0,1fr)_130px_44px]";

// Money in: what each member handed to the fund this month, and what the
// fund handed back.
export function GroupContributionsTab({ data, view, onAdd, onEdit, onRemove }: GroupContributionsTabProps) {
  const { t } = useLocale();
  const { currency } = data;
  const [memberId, setMemberId] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const totals = contributionTotals(data.contributions);
  const perMember = contributionsByMember(data.contributions, data.members);
  const rows = [...data.contributions]
    .filter((c) => (!memberId || c.groupMemberId === memberId) && (kind === "all" || (kind === "deposit" ? Number(c.amount) >= 0 : Number(c.amount) < 0)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const shownTotal = rows.reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div className="flex flex-col gap-4">
      <Card padding="none" className="flex flex-col gap-3 px-5 pt-3 pb-4">
        <div className="flex flex-wrap items-center gap-5">
          <Figure label={t("Contributed")} value={formatCurrency(totals.deposited, currency)} tone="text-income" />
          <Figure label={t("Returned")} value={formatCurrency(totals.returned, currency)} tone={totals.returned > 0 ? "text-ink" : "text-ink-muted"} />
          <Figure label={t("Net in the fund")} value={formatCurrency(totals.net, currency)} divided={false} />
        </div>
        {perMember.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-small text-ink-muted">{t("By member")}</span>
            {perMember.map(({ member, amount }) => (
              <button key={member.id} type="button" onClick={() => setMemberId(memberId === member.id ? "" : member.id)} aria-pressed={memberId === member.id} className={cn("flex h-7.5 items-center gap-2 rounded-full border py-0 pr-3 pl-1 text-small tabular-nums transition-colors", memberId === member.id ? "border-emerald bg-mint-50 text-ink" : "border-line bg-cream text-ink-2 hover:border-line-strong")}>
                <PersonAvatar name={member.name} src={member.photoUrl} size={22} coloured />
                {member.name}
                <b className="text-ink">{formatCurrency(amount, currency)}</b>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          <NativeSelect size="sm" aria-label={t("Member")} value={memberId} onChange={(event) => setMemberId(event.target.value)} className="font-medium">
            <option value="">{t("All members")}</option>
            {data.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect size="sm" aria-label={t("Type")} value={kind} onChange={(event) => setKind(event.target.value as Kind)} className="font-medium">
            <option value="all">{t("Deposits and returns")}</option>
            <option value="deposit">{t("Deposits")}</option>
            <option value="return">{t("Returns")}</option>
          </NativeSelect>
          <span className="flex h-9.5 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-small font-medium text-ink">
            <Calendar className="size-4 text-ink-muted" aria-hidden="true" />
            {formatDate(data.range.from, "d MMM")} – {formatDate(data.range.to, "d MMM yyyy")}
          </span>
          <span className="flex-1" />
          <span className="text-small text-ink-muted">
            {rows.length} {t(rows.length === 1 ? "entry" : "entries")}
          </span>
          <Button size="sm" onClick={onAdd}>
            <Plus strokeWidth={2.25} />
            {t("Add contribution")}
          </Button>
        </div>
        <div className={cn("hidden items-center gap-4 border-y border-line bg-cream px-5 py-2 text-caption font-medium text-ink-muted md:grid", ROW)}>
          <span>{t("Date")}</span>
          <span>{t("Member")}</span>
          <span>{t("Type")}</span>
          <span>{t("Note")}</span>
          <span className="text-right">{t("Amount")}</span>
          <span />
        </div>
        {rows.length === 0 && <p className="border-t border-line px-5 py-10 text-center text-body text-ink-muted">{data.contributions.length === 0 ? t("No contribution this month yet.") : t("No entry matches.")}</p>}
        {rows.map((row) => {
          const amount = Number(row.amount);
          const isReturn = amount < 0;
          const member = view.memberById[row.groupMemberId] ?? row.groupMember;
          const locked = view.closed;
          return (
            <div key={row.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto_44px] items-center gap-3 border-b border-surface-sunken px-5 py-2.5 text-body tabular-nums md:min-h-11 md:gap-4 md:py-0", ROW)}>
              <span className="hidden text-ink-2 md:block">{formatDate(row.date, "dd MMM")}</span>
              <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
                <PersonAvatar name={member.name} src={member.photoUrl} size={26} coloured />
                <span className="truncate">{member.name}</span>
                <span className="text-caption font-normal text-ink-muted md:hidden">· {formatDate(row.date, "dd MMM")}</span>
              </span>
              <span className="hidden md:block">
                <Chip tone={isReturn ? "expense" : "income"} size="sm" className="font-semibold">
                  {t(isReturn ? "Return" : "Deposit")}
                </Chip>
              </span>
              <span className={cn("hidden truncate md:block", row.note ? "text-ink-2" : "text-ink-muted")}>{row.note || "—"}</span>
              <span className={cn("text-right font-semibold", isReturn ? "text-expense" : "text-income")}>{formatSignedCurrency(amount, currency)}</span>
              <DropdownMenu>
                <DropdownMenuTrigger aria-label={t("Actions for this entry")} className="flex size-8 items-center justify-center justify-self-end rounded-md text-ink-muted hover:bg-cream data-open:bg-cream">
                  {locked ? <Lock className="size-4" aria-hidden="true" /> : <MoreVertical className="size-4.5" aria-hidden="true" />}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                  <DropdownMenuItem onSelect={() => onEdit(row)} className="rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                    <Pencil className="size-4" aria-hidden="true" />
                    {t("Edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onRemove(row)} className="rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t("Delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
        {rows.length > 0 && (
          <div className={cn("grid h-11.5 grid-cols-[minmax(0,1fr)_auto_44px] items-center gap-3 bg-cream px-5 text-body font-semibold tabular-nums md:gap-4", ROW)}>
            <span className="md:col-span-4">{t("Total")}</span>
            <span className={cn("text-right", shownTotal < 0 ? "text-expense" : "text-income")}>{formatSignedCurrency(shownTotal, currency)}</span>
            <span />
          </div>
        )}
      </Card>
    </div>
  );
}
