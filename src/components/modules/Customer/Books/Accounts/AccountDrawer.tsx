"use client";

import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { archiveAccountAction, createAccountAction, removeAccountAction, unarchiveAccountAction, updateAccountAction } from "@/lib/customer/accountActions";
import { accountDisplayName } from "@/lib/customer/accountDisplay";
import type { Account, AccountType, LanguagePreference } from "@/lib/customer/api";
import { ACCOUNT_SUBTYPES, ACCOUNT_TYPE_META, ACCOUNT_TYPES, descendantIds, isAppManagedAccount, SUBTYPE_LABELS } from "@/lib/customer/booksDisplay";
import { currencySymbol } from "@/lib/customer/currency";
import { limitMoneyDecimals } from "@/lib/customer/money";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Drawer } from "../shared/Drawer";

interface AccountDrawerProps {
  open: boolean;
  // The account being edited; null adds a new one.
  editing: Account | null;
  // Every account in the workspace, for the parent list.
  accounts: Account[];
  businessId: string;
  preferredLanguage: LanguagePreference;
  currency: string;
  onClose: () => void;
  // Where to go once the account is gone (the detail page leaves).
  onRemoved?: () => void;
}

// Add or edit an account: its name in both languages, type, kind, code,
// parent and, for a new one, the balance it starts with. Editing also
// offers to archive or remove it.
export function AccountDrawer({ open, editing, accounts, businessId, preferredLanguage, currency, onClose, onRemoved }: AccountDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("ASSET");
  const [subtype, setSubtype] = useState("");
  const [code, setCode] = useState("");
  const [parentId, setParentId] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [removing, setRemoving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setNameBn(editing?.nameBn ?? "");
      setAccountType(editing?.accountType ?? "ASSET");
      setSubtype(editing?.accountSubtype ?? "");
      setCode(editing?.accountNumber ?? "");
      setParentId(editing?.parentId ?? "");
      setOpeningBalance("");
      setRemoving(false);
    }
  }

  const system = editing?.isSystemAccount ?? false;
  // The app posts through it (receivables, payables, the assets' and the
  // savings pools, referral payouts): the backend refuses to archive or
  // remove it, so the drawer offers neither.
  const reserved = editing ? isAppManagedAccount(editing) : false;
  const excluded = editing ? descendantIds(editing) : new Set<string>();
  const parents = accounts.filter((account) => account.accountType === accountType && account.status === "ACTIVE" && !excluded.has(account.id));
  const valid = name.trim().length > 0;
  // The API archives a parent only once its sub-accounts are archived, and
  // removes it only once they are gone; it brings a sub-account back only
  // under an active parent. Said here, before the button is pressed.
  const archived = editing?.status === "ARCHIVED";
  const children = editing?.children ?? [];
  const savedParentId = editing?.parentId ?? null;
  const archiveBlocked = !archived && children.some((child) => child.status === "ACTIVE");
  const removeBlocked = children.length > 0;
  const parentArchived = archived && savedParentId !== null && accounts.some((account) => account.id === savedParentId && account.status === "ARCHIVED");
  const blockedReason = parentArchived ? t("Make its parent account active first.") : archiveBlocked ? t("Archive or remove its sub-accounts first.") : removeBlocked ? t("To remove it, remove its sub-accounts first.") : null;

  function finish(message: string) {
    toast.success(message);
    onClose();
    router.refresh();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const shared = { name: name.trim(), nameBn: nameBn.trim(), accountNumber: code.trim() };
      const result = editing
        ? await updateAccountAction(businessId, editing.id, { ...shared, ...(system || accountType !== "ASSET" ? {} : { accountSubtype: subtype }), parentId: parentId || null })
        : await createAccountAction(businessId, { ...shared, nameBn: shared.nameBn || undefined, accountNumber: shared.accountNumber || undefined, accountType, accountSubtype: accountType === "ASSET" && subtype ? subtype : undefined, parentId: parentId || undefined, openingBalance: openingBalance ? Number(openingBalance).toFixed(2) : undefined });
      if (result.success) finish(t(editing ? "Account updated" : "Account added"));
      // The action's own fallback words are dictionary keys too, so t()
      // translates them; the API's own sentence stays as it was sent.
      else toast.error(t(result.message ?? (editing ? "Failed to update account" : "Failed to create account")));
    });
  }

  function toggleArchive() {
    if (!editing) return;
    startTransition(async () => {
      const result = archived ? await unarchiveAccountAction(businessId, editing.id) : await archiveAccountAction(businessId, editing.id);
      if (result.success) finish(t(archived ? "Account is active again" : "Account archived"));
      else toast.error(t(result.message ?? (archived ? "Failed to reactivate account" : "Failed to archive account")));
    });
  }

  function remove() {
    if (!editing) return;
    startTransition(async () => {
      const result = await removeAccountAction(businessId, editing.id);
      if (result.success) {
        toast.success(t(result.data?.deleted ? "Account removed" : "Account archived, as it has entries"));
        setRemoving(false);
        onClose();
        if (result.data?.deleted && onRemoved) onRemoved();
        else router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to remove account"));
      }
    });
  }

  const optional = <span className="font-normal text-ink-muted"> ({t("optional")})</span>;

  return (
    <>
      <Drawer
        open={open}
        title={editing ? t("Edit account") : t("Add account")}
        busy={isPending}
        onClose={onClose}
        onSubmit={submit}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader />}
              {t(editing ? "Save changes" : "Add account")}
            </Button>
          </>
        }
      >
        <Field htmlFor="acc-name" label={t("Name")}>
          <Input id="acc-name" size="md" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoFocus placeholder={t("e.g. Cash in hand, Islami Bank, Shop rent")} />
        </Field>
        <Field htmlFor="acc-name-bn" label={<>{t("Name in Bangla")}{optional}</>}>
          <Input id="acc-name-bn" size="md" lang="bn" value={nameBn} onChange={(event) => setNameBn(event.target.value)} maxLength={120} placeholder="যেমন হাতে নগদ" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="acc-type" label={t("Type")} hint={editing ? t("The type can't change once an account exists.") : undefined}>
            <NativeSelect
              id="acc-type"
              value={accountType}
              disabled={!!editing}
              onChange={(event) => {
                setAccountType(event.target.value as AccountType);
                setParentId("");
                setSubtype("");
              }}
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(ACCOUNT_TYPE_META[type].singular)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field htmlFor="acc-code" label={<>{t("Code")}{optional}</>} hint={t("Accountants number accounts: 1000s own, 2000s owe, 3000s the owner's share, 4000s income, 5000s expenses.")}>
            <Input id="acc-code" size="md" value={code} onChange={(event) => setCode(event.target.value)} maxLength={20} placeholder="1010" className="font-mono" />
          </Field>
        </div>

        {accountType === "ASSET" && (
          <Field htmlFor="acc-subtype" label={t("What kind of asset")} hint={system ? t("A default account's kind is how the app finds it, so it stays.") : t("Cash, bank, mobile banking and card accounts show up as wallets you can pay from.")}>
            <NativeSelect id="acc-subtype" value={subtype} disabled={system} onChange={(event) => setSubtype(event.target.value)}>
              {system && subtype && !ACCOUNT_SUBTYPES.includes(subtype) ? (
                <option value={subtype}>{t(SUBTYPE_LABELS[subtype] ?? subtype)}</option>
              ) : (
                <>
                  <option value="">{t("Something else")}</option>
                  {ACCOUNT_SUBTYPES.map((value) => (
                    <option key={value} value={value}>
                      {t(SUBTYPE_LABELS[value])}
                    </option>
                  ))}
                </>
              )}
            </NativeSelect>
          </Field>
        )}

        <Field htmlFor="acc-parent" label={<>{t("Under")}{optional}</>} hint={t("A sub-account is listed under its parent; each keeps its own balance.")}>
          <NativeSelect id="acc-parent" value={parentId} onChange={(event) => setParentId(event.target.value)}>
            <option value="">{t("No parent, a top-level account")}</option>
            {parents.map((account) => (
              <option key={account.id} value={account.id}>
                {accountDisplayName(account, preferredLanguage)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        {!editing && (
          <Field htmlFor="acc-opening" label={<>{t("Opening balance")}{optional}</>} hint={t("What the account holds today. It can't be changed later, only adjusted with an entry.")}>
            <Input id="acc-opening" size="md" inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(limitMoneyDecimals(event.target.value))} placeholder="0.00" className="tabular-nums" leading={<span className="font-semibold text-ink-2">{currencySymbol(currency)}</span>} />
          </Field>
        )}

        {editing && !reserved && (
          <div className="mt-2 flex flex-col gap-3 rounded-md border border-line bg-strip p-4">
            <span className="flex flex-col gap-0.5">
              <b className="text-body font-semibold text-ink">{t(archived ? "This account is archived" : "Archive or remove")}</b>
              <span className="text-small text-ink-muted">{t(archived ? "It stays in the books but can't take new entries. Bring it back any time." : "An archived account keeps its history but takes no new entries. Removing is only possible while it has none.")}</span>
            </span>
            <span className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={toggleArchive} disabled={isPending || archiveBlocked || parentArchived} aria-describedby={blockedReason ? "acc-archive-reason" : undefined}>
                {archived ? <ArchiveRestore /> : <Archive />}
                {t(archived ? "Make active again" : "Archive account")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setRemoving(true)} disabled={isPending || removeBlocked} aria-describedby={blockedReason ? "acc-archive-reason" : undefined} className="text-expense hover:bg-expense-soft hover:text-expense">
                <Trash2 />
                {t("Remove account")}
              </Button>
            </span>
            {blockedReason && (
              <p id="acc-archive-reason" className="text-caption text-ink-muted">
                {blockedReason}
              </p>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={removing} onClose={() => setRemoving(false)} onConfirm={remove} isPending={isPending} danger title={t("Remove this account?")} description={editing ? t("{name} will be removed from the books. If it already has entries it is archived instead, so nothing is lost.", { name: accountDisplayName(editing, preferredLanguage) }) : ""} confirmLabel={t("Remove")} />
    </>
  );
}
