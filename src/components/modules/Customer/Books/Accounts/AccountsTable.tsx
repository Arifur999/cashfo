"use client";

import { ChevronRight, Landmark, Search } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import IconTile from "@/components/smartly/IconTile";
import { LIST_GROUP, ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow, ListRowLink } from "@/components/smartly/list";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { accountDisplayName } from "@/lib/customer/accountDisplay";
import type { Account, AccountGroup, AccountType, LanguagePreference } from "@/lib/customer/api";
import { ACCOUNT_TYPE_META, ACCOUNT_TYPES, filterAccounts, flattenAccounts, groupOf, groupTotal, subtypeLabel, type AccountFilter } from "@/lib/customer/booksDisplay";
import { formatCount } from "@/lib/i18n/digits";
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
  canManage: boolean;
  onAdd: () => void;
}

const FILTERS: AccountFilter[] = ["ALL", ...ACCOUNT_TYPES];

// Income and expense balances run from the first entry, not this year.
const SINCE_START: AccountType[] = ["INCOME", "EXPENSE"];

const COLUMNS_WITH_CODES = "md:grid-cols-[84px_minmax(0,1fr)_140px_140px_32px]";
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_140px_140px_32px]";

// Every account by group, the way an accountant reads them: a filter by
// type, a search, and a row per account that opens its ledger.
export function AccountsTable({ groups, preferredLanguage, currency, hasCodes, canManage, onAdd }: AccountsTableProps) {
  const { t, fmt } = useLocale();
  const [filter, setFilter] = useState<AccountFilter>("ALL");
  const [query, setQuery] = useState("");
  const columns = hasCodes ? COLUMNS_WITH_CODES : COLUMNS;

  const sections = (filter === "ALL" ? ACCOUNT_TYPES : [filter])
    .map((type) => {
      const accounts = groupOf(groups, type);
      return { type, accounts, rows: filterAccounts(flattenAccounts(accounts), query) };
    })
    .filter((section) => section.rows.length > 0 || (query.trim() === "" && filter !== "ALL"));
  const total = groups.reduce((sum, group) => sum + flattenAccounts(group.accounts).length, 0);

  function notes(account: Account): string {
    const kind = subtypeLabel(account.accountSubtype);
    const count = account.children.length;
    // "Cash · Cash" says nothing twice.
    const parts = [kind && kind.toLowerCase() !== account.name.trim().toLowerCase() ? t(kind) : null, count > 0 ? t(count === 1 ? "{count} sub-account" : "{count} sub-accounts", { count: formatCount(count, fmt) }) : null].filter((part): part is string => !!part);
    if (parts.length === 0 && account.isSystemAccount) parts.push(t("Default account"));
    return parts.join(" · ");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* On a phone the six types sit in an even 3 × 2 rather than off screen. */}
        <SegmentedControl label={t("Show accounts of one type")} value={filter} onChange={setFilter} options={FILTERS.map((value) => ({ value, label: value === "ALL" ? t("All") : t(ACCOUNT_TYPE_META[value].label) }))} className="max-sm:grid max-sm:w-full max-sm:grid-cols-3" />
        <Input size="sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search accounts")} aria-label={t("Search accounts")} leading={<Search />} frameClassName="sm:ml-auto sm:w-65" />
      </div>

      <ListCard id="accounts-chart" label={t("Accounts")}>
        {total === 0 ? (
          <ListEmpty icon={<Landmark />} tone="neutral" title={t("No accounts yet.")} description={canManage ? t("Add the accounts the business keeps: cash, bank, what it owes, what it earns and spends.") : undefined} action={canManage && <Button onClick={onAdd}>{t("Add account")}</Button>} />
        ) : sections.length === 0 ? (
          <ListEmpty icon={<Search />} tone="neutral" title={t("No account matches “{query}”.", { query: query.trim() })} action={<Button variant="secondary" onClick={() => setQuery("")}>{t("Clear search")}</Button>} />
        ) : (
          <>
            <ListHead columns={columns}>
              {hasCodes && <ListHeadCell>{t("Code")}</ListHeadCell>}
              <ListHeadCell>{t("Account")}</ListHeadCell>
              <ListHeadCell>{t("Type")}</ListHeadCell>
              <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
              <ListHeadCell>
                <span className="sr-only">{t("Open")}</span>
              </ListHeadCell>
            </ListHead>
            {sections.map(({ type, accounts, rows }) => {
              const meta = ACCOUNT_TYPE_META[type];
              const Icon = ACCOUNT_TYPE_ICONS[type];
              return (
                <div key={type} role="rowgroup" aria-label={t(meta.label)}>
                  {/* The group's band; from the second group on it draws the line above it too. */}
                  <div role="row" className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-b border-divider py-3 [[role=rowgroup]+[role=rowgroup]>&]:border-t", LIST_GROUP, columns)}>
                    <div role="cell" className={cn("flex min-w-0 items-center gap-3", hasCodes ? "md:col-span-3" : "md:col-span-2")}>
                      <IconTile size={32} tone={meta.tone}>
                        <Icon />
                      </IconTile>
                      <span className="flex min-w-0 flex-col">
                        <b className="text-body font-bold text-ink">{t(meta.label)}</b>
                        <span className="text-caption font-normal text-ink-muted">{SINCE_START.includes(type) ? `${t(meta.sub)} · ${t("since you started")}` : t(meta.sub)}</span>
                      </span>
                    </div>
                    <div role="cell" className="text-right">
                      <BalanceText value={groupTotal(accounts)} currency={currency} className="text-body-lg font-bold" />
                    </div>
                    <div role="cell" className="hidden md:block" />
                  </div>
                  {rows.length === 0 && (
                    <div role="row">
                      <p role="cell" className="px-4 py-4 text-small text-ink-muted md:px-6">
                        {t("No accounts in this group yet.")}
                      </p>
                    </div>
                  )}
                  {rows.map(({ account, depth }) => {
                    const archived = account.status === "ARCHIVED";
                    const name = accountDisplayName(account, preferredLanguage);
                    const sub = notes(account);
                    return (
                      <ListRow key={account.id} columns={columns} muted={archived}>
                        {hasCodes && <ListCell className="hidden font-mono text-small text-ink-muted md:block">{account.accountNumber}</ListCell>}
                        <ListCell className="flex min-w-0 flex-col" style={depth > 0 ? { paddingLeft: depth * 16 } : undefined}>
                          <span className="flex min-w-0 items-center gap-2">
                            <ListRowLink href={`/accounts/${account.id}`} className="truncate text-body font-semibold text-ink">
                              {name}
                            </ListRowLink>
                            {archived && (
                              <Chip tone="neutral" size="sm">
                                {t("Archived")}
                              </Chip>
                            )}
                          </span>
                          <span className="truncate text-caption text-ink-muted md:hidden">{[account.accountNumber, t(meta.singular), sub || null].filter(Boolean).join(" · ")}</span>
                          {sub && <span className="hidden truncate text-caption text-ink-muted md:block">{sub}</span>}
                        </ListCell>
                        <ListCell className="hidden text-small text-ink-2 md:block">{t(meta.singular)}</ListCell>
                        <ListCell align="end">
                          <BalanceText value={account.currentBalance} currency={currency} className="text-body font-semibold" />
                        </ListCell>
                        <ListCell className="hidden justify-end md:flex">
                          <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
                        </ListCell>
                      </ListRow>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </ListCard>
    </div>
  );
}
