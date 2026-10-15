"use client";

import { Archive, ArchiveRestore, FileText, Info, MessageCircle, MoreVertical, Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { GroupMember } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { memberSince } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
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
const ROW = "md:grid-cols-[minmax(0,1fr)_124px_100px_110px_190px_120px]";

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
  const paidIn = (id: string) => data.contributions.filter((c) => c.groupMemberId === id).reduce((sum, c) => sum + Number(c.amount), 0);
  const month = monthName(data.range.key, locale);

  return (
    <div className="flex flex-col gap-4">
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <SegmentedControl
            label={t("Status")}
            variant="soft"
            value={filter}
            onChange={setFilter}
            options={(["ACTIVE", "ARCHIVED", "ALL"] as Filter[]).map((value) => ({
              value,
              label: (
                <>
                  {t(value === "ACTIVE" ? "Active" : value === "ARCHIVED" ? "Archived" : "All")} <span className="text-ink-muted">{counts[value]}</span>
                </>
              ),
            }))}
          />
          <div className="flex gap-3">
            <Input size="sm" type="search" value={query} onChange={(event) => setQuery(event.target.value)} leading={<Search />} placeholder={t("Search name or phone…")} aria-label={t("Search members")} frameClassName="md:w-60" />
            <Button variant="secondary" size="sm" onClick={onAdd}>
              <UserPlus />
              {t("Add member")}
            </Button>
          </div>
        </div>
        <div className={cn("hidden items-center gap-4 border-y border-line bg-cream px-5 py-2 text-caption font-medium text-ink-muted md:grid", ROW)}>
          <span>{t("Member")}</span>
          <span>{t("Phone")}</span>
          <span>{t("Member since")}</span>
          <span className="text-right">{t("Paid in")}</span>
          <span className="text-right">
            {month} {t("balance")}
          </span>
          <span className="text-right">{t("Actions")}</span>
        </div>
        {shown.length === 0 && (
          <div className="flex flex-col items-center gap-2 border-t border-line px-5 py-10 text-center">
            <Users className="size-6 text-ink-muted" aria-hidden="true" />
            <p className="text-body text-ink-muted">{data.members.length === 0 ? t("No member yet. Add the people who share the costs.") : t("No member matches.")}</p>
          </div>
        )}
        {shown.map((member) => {
          const active = member.status === "ACTIVE";
          return (
            <div key={member.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-surface-sunken px-5 py-3 text-body tabular-nums md:min-h-15.5 md:gap-4 md:py-0", ROW)}>
              <span className="flex min-w-0 items-center gap-3">
                <PersonAvatar name={member.name} src={member.photoUrl} size={36} coloured className={cn(!active && "opacity-60")} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={cn("truncate font-semibold", active ? "text-ink" : "text-ink-muted")}>{member.name}</span>
                  <span className="truncate text-caption font-normal text-ink-muted">{active ? t("Active member") : t("Archived")}</span>
                </span>
              </span>
              <span className="hidden text-ink-2 md:block">{member.phone ?? "—"}</span>
              <span className="hidden text-ink-2 md:block">{monthName(memberSince(member), locale, "short", true)}</span>
              <span className="hidden text-right text-ink md:block">{formatCurrency(paidIn(member.id), data.currency)}</span>
              <BalanceCell value={view.balances[member.id] ?? 0} currency={data.currency} className="hidden md:flex" />
              <span className="flex justify-end gap-1">
                <Button variant="outline" size="sm" onClick={() => onStatement(member)} className="h-8 gap-1 px-3 text-small">
                  <FileText className="size-4" />
                  {t("Statement")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label={`${t("More actions for")} ${member.name}`} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-cream data-open:bg-cream">
                    <MoreVertical className="size-4.5" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                    <DropdownMenuItem onSelect={() => onEdit(member)} className="rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                      <Pencil className="size-4" aria-hidden="true" />
                      {t("Edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onToggleStatus(member)} className="rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                      {active ? <Archive className="size-4" aria-hidden="true" /> : <ArchiveRestore className="size-4" aria-hidden="true" />}
                      {t(active ? "Archive" : "Bring back")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onRemove(member)} className="rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
                      <Trash2 className="size-4" aria-hidden="true" />
                      {t("Remove")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </div>
          );
        })}
        {archived.length > 0 && filter !== "ARCHIVED" && (
          <div className="flex items-start gap-3 bg-cream px-5 py-3 text-small text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span>
              <b className="font-semibold text-ink">{archived.map((m) => m.name).join(", ")}</b> {t(archived.length === 1 ? "is archived. Their past months still count; from now on they are left out of every split." : "are archived. Their past months still count; from now on they are left out of every split.")}
            </span>
          </div>
        )}
      </Card>

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
