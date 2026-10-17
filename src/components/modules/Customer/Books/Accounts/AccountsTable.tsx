"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import IconTile from "@/components/smartly/IconTile";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { accountDisplayName } from "@/lib/customer/accountDisplay";
import type { Account, AccountGroup, LanguagePreference } from "@/lib/customer/api";
import { ACCOUNT_TYPE_META, ACCOUNT_TYPES, filterAccounts, flattenAccounts, groupOf, groupTotal, subtypeLabel, type AccountFilter } from "@/lib/customer/booksDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ACCOUNT_TYPE_ICONS } from "../shared/accountTypeDisplay";
import { BalanceText } from "../shared/BalanceText";

interface AccountsTableProps {
  groups: AccountGroup[];
  preferredLanguage: LanguagePreference;
  currency: string;
  // A chart with no codes at all drops the Code column.
  hasCodes: boolean;
}

const FILTERS: AccountFilter[] = ["ALL", ...ACCOUNT_TYPES];

// Every account by group, the way an accountant reads them: a filter by
// type, a search, and a row per account that opens its ledger.
export function AccountsTable({ groups, preferredLanguage, currency, hasCodes }: AccountsTableProps) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<AccountFilter>("ALL");
  const [query, setQuery] = useState("");
  const grid = hasCodes ? "md:grid md:grid-cols-[92px_minmax(0,1fr)_180px_150px_44px] md:items-center md:gap-x-4" : "md:grid md:grid-cols-[minmax(0,1fr)_180px_150px_44px] md:items-center md:gap-x-4";

  const sections = (filter === "ALL" ? ACCOUNT_TYPES : [filter])
    .map((type) => {
      const accounts = groupOf(groups, type);
      return { type, accounts, rows: filterAccounts(flattenAccounts(accounts), query) };
    })
    .filter((section) => section.rows.length > 0 || (query.trim() === "" && filter !== "ALL"));
  const total = groups.reduce((sum, group) => sum + flattenAccounts(group.accounts).length, 0);

  function notes(account: Account): string {
    const kind = subtypeLabel(account.accountSubtype);
    // "Cash · Cash" says nothing twice.
    const parts = [kind && kind.toLowerCase() !== account.name.trim().toLowerCase() ? kind : null, account.children.length > 0 ? `${account.children.length} ${t(account.children.length === 1 ? "sub-account" : "sub-accounts")}` : null].filter((part): part is string => !!part).map((part) => t(part));
    if (parts.length === 0 && account.isSystemAccount) parts.push(t("Default account"));
    return parts.join(" · ");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SegmentedControl label={t("Show accounts of one type")} value={filter} onChange={setFilter} options={FILTERS.map((value) => ({ value, label: value === "ALL" ? t("All") : t(ACCOUNT_TYPE_META[value].label) }))} className="max-sm:w-full max-sm:overflow-x-auto" />
        <Input size="sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search accounts")} aria-label={t("Search accounts")} leading={<Search />} frameClassName="sm:ml-auto sm:w-65" />
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className={cn("hidden px-5 py-3 text-caption font-semibold text-ink-muted", grid)}>
          {hasCodes && <span>{t("Code")}</span>}
          <span>{t("Account")}</span>
          <span>{t("Type")}</span>
          <span className="text-right">{t("Balance")}</span>
          <span />
        </div>
        {total === 0 && <p className="border-t border-line px-5 py-10 text-center text-body text-ink-muted">{t("No accounts yet.")}</p>}
        {total > 0 && sections.length === 0 && (
          <p className="border-t border-line px-5 py-10 text-center text-body text-ink-muted">
            {t("No account matches")} “{query.trim()}”.
          </p>
        )}
        {sections.map(({ type, accounts, rows }) => {
          const meta = ACCOUNT_TYPE_META[type];
          const Icon = ACCOUNT_TYPE_ICONS[type];
          return (
            <section key={type} aria-label={t(meta.label)}>
              <div className={cn("flex items-center justify-between gap-3 border-t border-line bg-cream px-5 py-3", grid)}>
                <span className={cn("flex min-w-0 items-center gap-3", hasCodes && "md:col-span-2")}>
                  <IconTile size={32} tone={meta.tone}>
                    <Icon />
                  </IconTile>
                  <span className="flex min-w-0 flex-col">
                    <b className="text-body font-bold text-ink">{t(meta.label)}</b>
                    <span className="text-caption text-ink-muted">{t(meta.sub)}</span>
                  </span>
                </span>
                <span className="hidden md:block" />
                <BalanceText value={groupTotal(accounts)} currency={currency} className="text-body-lg font-bold md:text-right" />
                <span className="hidden md:block" />
              </div>
              {rows.length === 0 && <p className="border-t border-surface-sunken px-5 py-4 text-small text-ink-muted">{t("No accounts in this group yet.")}</p>}
              {rows.map(({ account, depth }) => {
                const archived = account.status === "ARCHIVED";
                const name = accountDisplayName(account, preferredLanguage);
                const sub = notes(account);
                return (
                  <Link key={account.id} href={`/accounts/${account.id}`} className={cn("flex min-h-14 items-center justify-between gap-3 border-t border-surface-sunken px-5 py-2 transition-colors hover:bg-cream/60", grid, archived && "opacity-60")}>
                    {hasCodes && <span className="hidden font-mono text-small text-ink-muted md:block">{account.accountNumber}</span>}
                    <span className="flex min-w-0 flex-col" style={depth > 0 ? { paddingLeft: depth * 16 } : undefined}>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-body font-semibold text-ink">{name}</span>
                        {archived && (
                          <Chip tone="neutral" size="sm">
                            {t("Archived")}
                          </Chip>
                        )}
                      </span>
                      <span className="truncate text-caption text-ink-muted md:hidden">{[account.accountNumber, t(meta.singular), sub || null].filter(Boolean).join(" · ")}</span>
                      {sub && <span className="hidden truncate text-caption text-ink-muted md:block">{sub}</span>}
                    </span>
                    <span className="hidden text-small text-ink-2 md:block">{t(meta.singular)}</span>
                    <BalanceText value={account.currentBalance} currency={currency} className="text-body font-semibold md:text-right" />
                    <span className="hidden justify-end md:flex">
                      <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </section>
          );
        })}
      </Card>
    </div>
  );
}
