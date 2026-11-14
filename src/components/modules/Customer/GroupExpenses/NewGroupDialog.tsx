"use client";

import { Info, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import type { GroupKind, GroupMemberRole, GroupSplit } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { createBusinessAction } from "@/lib/customer/businessActions";
import { countLabel } from "@/lib/customer/groupDisplay";
import { createGroupMemberAction, setupGroupCategoriesAction, updateGroupSettingsAction } from "@/lib/customer/groupExpensesActions";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GROUP_KIND } from "./GroupBits";
import { GroupDialog } from "./GroupDialog";

interface NewGroupDialogProps {
  open: boolean;
  onClose: () => void;
  // The other groups' names: a new one can't repeat them.
  takenNames: string[];
}

// The 9 categories every new group starts with (the board's list). A family
// splits the bazar by shares; every other kind shares everything equally.
const STARTER_CATEGORIES: { name: string; icon: string; color: string; family: GroupSplit }[] = [
  { name: "Bazar & grocery", icon: "shopping-cart", color: "green", family: "SHARES" },
  { name: "Rent", icon: "house", color: "orange", family: "EQUAL" },
  { name: "Utility bills", icon: "zap", color: "blue", family: "EQUAL" },
  { name: "Medicine", icon: "pill", color: "cyan", family: "EQUAL" },
  { name: "Maid", icon: "sparkles", color: "pink", family: "EQUAL" },
  { name: "Internet", icon: "wifi", color: "violet", family: "EQUAL" },
  { name: "Education", icon: "book-open", color: "yellow", family: "EQUAL" },
  { name: "Transport", icon: "car", color: "lime", family: "EQUAL" },
  { name: "Other", icon: "package", color: "gray", family: "EQUAL" },
];
const KINDS: GroupKind[] = ["FAMILY", "MESS", "TRIP", "OFFICE"];
const MAX_EDITORS = 2;
// Name, phone, shares, access, link, remove: the board's member grid.
const GRID = "grid grid-cols-[minmax(0,1fr)_140px_64px_132px_138px_34px] gap-2";
const CELL = "h-10 w-full min-w-0 rounded-field border bg-surface px-2.5 text-body text-ink outline-none transition-[border-color,box-shadow] focus:border-focus-ring focus:focus-halo";

interface Row {
  key: number;
  name: string;
  phone: string;
  shares: string;
  role: GroupMemberRole;
}
interface RowError {
  name?: string;
  phone?: string;
  shares?: string;
}

const blankRow = (key: number): Row => ({ key, name: "", phone: "", shares: "1", role: "MEMBER" });
const sharesOk = (value: string) => /^\d+$/.test(value.trim()) && Number(value) >= 1 && Number(value) <= 50;
// A Bangladeshi mobile number, as 01XXXXXXXXX; "" when it isn't one.
const phoneNorm = (value: string) => {
  const digits = value.replace(/[\s-]/g, "").replace(/^\+?88/, "");
  return /^01[3-9]\d{8}$/.test(digits) ? digits : "";
};
// 01711-482915, as the boards write a number.
const phoneShow = (value: string) => {
  const digits = phoneNorm(value) || value;
  return digits.length === 11 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

// New group (the v16 GroupList board's popup): its name, what kind of group
// it is, and the people who share the costs, each with a phone, their shares
// and their access. You are its Admin. The group, its members and its 9
// starter categories are then made in one go.
export function NewGroupDialog({ open, onClose, takenNames }: NewGroupDialogProps) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<GroupKind>("FAMILY");
  const [ownShares, setOwnShares] = useState("1");
  const [rows, setRows] = useState<Row[]>([blankRow(0)]);
  const [nextKey, setNextKey] = useState(1);
  const [nameError, setNameError] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<number, RowError>>({});
  const [ownBad, setOwnBad] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [isPending, startTransition] = useTransition();
  const me = user.name.trim() || t("You");

  // Each time it opens, a fresh group: nothing from the last attempt.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName("");
      setKind("FAMILY");
      setOwnShares("1");
      setRows([blankRow(0)]);
      setNextKey(1);
      setNameError("");
      setRowErrors({});
      setOwnBad(false);
      setMembersError("");
    }
  }

  const updateRow = (key: number, change: Partial<Row>) => {
    setRows(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));
    setRowErrors({ ...rowErrors, [key]: {} });
    setMembersError("");
  };

  function create() {
    const trimmed = name.trim();
    let bad = false;
    const nameIssue = !trimmed ? t("Give the group a name.") : takenNames.some((taken) => taken.trim().toLowerCase() === trimmed.toLowerCase()) ? t("You already have a group with this name.") : "";
    if (nameIssue) bad = true;
    const ownIssue = !sharesOk(ownShares);
    let membersIssue = ownIssue ? t("Shares must be a whole number from 1 to 50.") : "";
    if (ownIssue) bad = true;
    const seen = new Set<string>(user.phone ? [phoneNorm(user.phone)] : []);
    const errors: Record<number, RowError> = {};
    const keep: { name: string; phone: string; shares: number; role: GroupMemberRole }[] = [];
    for (const row of rows) {
      const rowName = row.name.trim();
      const phone = row.phone.trim();
      if (!rowName && !phone) continue;
      const error: RowError = {};
      if (!rowName) error.name = t("Write the member’s name.");
      const digits = phone ? phoneNorm(phone) : "";
      if (phone && !digits) error.phone = t("Use an 11-digit mobile number, like 01819-205377.");
      else if (digits && seen.has(digits)) error.phone = t("This number is already in the group.");
      if (digits) seen.add(digits);
      if (!sharesOk(row.shares)) error.shares = t("Shares must be a whole number from 1 to 50.");
      errors[row.key] = error;
      if (error.name || error.phone || error.shares) bad = true;
      else keep.push({ name: rowName, phone: digits, shares: Number(row.shares), role: row.role });
    }
    if (!bad && keep.length === 0) {
      membersIssue = t("Add at least one more member.");
      bad = true;
    }
    // You keep the cash as one Editor: one more can join you.
    if (!bad && keep.filter((person) => person.role === "ACCOUNTANT").length > MAX_EDITORS - 1) {
      membersIssue = t("A group can have up to 2 Editors, you included.");
      bad = true;
    }
    setNameError(nameIssue);
    setOwnBad(ownIssue);
    setRowErrors(errors);
    setMembersError(membersIssue);
    if (bad || isPending) return;

    startTransition(async () => {
      const offline = t(OFFLINE_MESSAGE), stale = t(STALE_MESSAGE);
      const created = await attempt(() => createBusinessAction({ name: trimmed, currency: "BDT", type: "GROUP" }), offline, stale);
      if (!created.success || !created.data) {
        toast.error(created.message ?? t("Failed to create the group"));
        return;
      }
      const businessId = created.data.id;
      const settings = await attempt(() => updateGroupSettingsAction(businessId, { kind }), offline, stale);
      // One at a time, you first: you keep the cash until an Editor does.
      let failed = 0;
      const owner = await attempt(() => createGroupMemberAction(businessId, { name: me, role: "ACCOUNTANT", isOwner: true, shareUnits: Number(ownShares), ...(user.phone && { phone: user.phone }) }), offline, stale);
      if (!owner.success) failed++;
      for (const person of keep) {
        const result = await attempt(() => createGroupMemberAction(businessId, { name: person.name, role: person.role, shareUnits: person.shares, ...(person.phone && { phone: person.phone }) }), offline, stale);
        if (!result.success) failed++;
      }
      const categories = await attempt(
        () => setupGroupCategoriesAction(businessId, STARTER_CATEGORIES.map((category) => ({ name: category.name, icon: category.icon, color: category.color, defaultSplit: kind === "FAMILY" ? category.family : "EQUAL" }))),
        offline,
        stale,
      );
      if (failed > 0) toast.warning(countLabel(t, fmt, failed, "{count} member could not be added", "{count} members could not be added"));
      if (!settings.success) toast.warning(t("Group created, but its kind didn't save. Set it in Settings."));
      if (!categories.success) toast.warning(t("Group created, but its categories didn't save. Add them in Categories."));
      else if (failed === 0 && settings.success) toast.success(t("Created {name}", { name: trimmed }));
      onClose();
      router.push(`/group-expenses/${businessId}`);
      router.refresh();
    });
  }

  const label = "text-[13px] font-semibold text-ink-2";

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={820}
      title={<span className="text-[19px]">{t("New group")}</span>}
      sub={<span className="text-[13px]">{t("You will be its Admin. Add the people who share the costs.")}</span>}
      bodyClassName="gap-4.5 pt-4.5 pb-5 max-h-[min(72vh,680px)]"
      onSubmit={(event) => {
        event.preventDefault();
        create();
      }}
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending} className="px-4.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={isPending} className="px-5.5">
            {isPending && <Loader />}
            {t("Create group")}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className={label}>{t("Group name")}</span>
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setNameError("");
          }}
          maxLength={40}
          autoFocus
          placeholder={t("e.g. Mirpur Family")}
          aria-invalid={!!nameError || undefined}
          className={cn(CELL, "h-11", nameError ? "border-expense" : "border-input")}
        />
        {nameError && (
          <span role="alert" className="text-caption text-expense">
            {nameError}
          </span>
        )}
      </label>

      <div className="flex flex-col gap-2">
        <span className={label}>{t("What kind of group?")}</span>
        <div role="radiogroup" aria-label={t("What kind of group?")} className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {KINDS.map((value) => {
            const item = GROUP_KIND[value];
            const on = kind === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setKind(value)}
                className={cn("flex min-h-16 items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left", on ? "border-[1.5px] border-emerald bg-emerald-wash" : "border border-line bg-surface hover:border-mint-200")}
              >
                <span className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4.5", item.cls)}>
                  <item.icon strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-body font-semibold text-ink">{t(item.label)}</span>
                  <span className="text-[11.5px] leading-[1.35] text-ink-muted">{t(item.hint)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2.5">
          <span className={label}>{t("Members")}</span>
          <span className="text-caption text-ink-muted">{t("Shares: how many people each member pays for (used for bazar in a family).")}</span>
        </div>
        <div className="overflow-x-auto rounded-[14px] border border-line-card">
          <div className="min-w-[700px]">
            <div className={cn(GRID, "bg-hover px-3 py-2 text-[11.5px] font-semibold text-ink-muted")}>
              <span>{t("Name")}</span>
              <span>{t("Phone")}</span>
              <span>{t("Shares")}</span>
              <span>{t("Access")}</span>
              <span>{t("Link")}</span>
              <span />
            </div>
            <div className={cn(GRID, "items-center border-t border-divider bg-emerald-wash/40 px-3 py-2")}>
              <span className="truncate text-body font-semibold text-ink">
                {me} {t("(you)")}
              </span>
              <span className="text-[13.5px] text-ink-2 tabular-nums">{user.phone ? toLocaleDigits(phoneShow(user.phone), fmt) : "–"}</span>
              <input value={ownShares} onChange={(event) => { setOwnShares(event.target.value); setOwnBad(false); setMembersError(""); }} inputMode="numeric" aria-label={t("Your shares")} aria-invalid={ownBad || undefined} className={cn(CELL, ownBad ? "border-expense" : "border-input")} />
              <span className="inline-flex h-6 items-center justify-self-start rounded-full bg-mint-50 px-2.25 text-caption font-semibold text-emerald">{t("Admin")}</span>
              <span className="text-caption text-ink-muted">{t("Your app login")}</span>
              <span />
            </div>
            {rows.map((row, index) => {
              const error = rowErrors[row.key] ?? {};
              const which = t("Member {number}", { number: toLocaleDigits(String(index + 1), fmt) });
              const message = error.name || error.phone || error.shares;
              return (
                <div key={row.key} className="flex flex-col gap-1 border-t border-divider px-3 py-2">
                  <div className={cn(GRID, "items-center")}>
                    <input value={row.name} onChange={(event) => updateRow(row.key, { name: event.target.value })} maxLength={40} placeholder={t("Member’s name")} aria-label={`${which}: ${t("name")}`} aria-invalid={!!error.name || undefined} className={cn(CELL, error.name ? "border-expense" : "border-input")} />
                    <input value={row.phone} onChange={(event) => updateRow(row.key, { phone: event.target.value })} type="tel" maxLength={14} placeholder="01XXX-XXXXXX" aria-label={`${which}: ${t("phone")}`} aria-invalid={!!error.phone || undefined} className={cn(CELL, error.phone ? "border-expense" : "border-input")} />
                    <input value={row.shares} onChange={(event) => updateRow(row.key, { shares: event.target.value })} inputMode="numeric" aria-label={`${which}: ${t("shares")}`} aria-invalid={!!error.shares || undefined} className={cn(CELL, error.shares ? "border-expense" : "border-input")} />
                    <select value={row.role} onChange={(event) => updateRow(row.key, { role: event.target.value as GroupMemberRole })} aria-label={`${which}: ${t("role")}`} className={cn(CELL, "cursor-pointer border-input")}>
                      <option value="MEMBER">{t("No access")}</option>
                      <option value="VIEWER">{t("Viewer")}</option>
                      <option value="ACCOUNTANT">{t("Editor")}</option>
                    </select>
                    <span className="text-[12.5px] font-semibold whitespace-nowrap text-ink-faint">–</span>
                    <button
                      type="button"
                      onClick={() => setRows(rows.filter((item) => item.key !== row.key))}
                      aria-label={t("Remove {name}", { name: which })}
                      className="flex size-8.5 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-muted transition-colors hover:border-expense-line hover:bg-expense-soft hover:text-expense-fill"
                    >
                      <X className="size-3.75" aria-hidden="true" />
                    </button>
                  </div>
                  {message && (
                    <span role="alert" className="text-caption text-expense">
                      {message}
                    </span>
                  )}
                </div>
              );
            })}
            <div className="border-t border-divider px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setRows([...rows, blankRow(nextKey)]);
                  setNextKey(nextKey + 1);
                }}
                className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold text-emerald hover:bg-emerald-wash"
              >
                <Plus className="size-3.75" strokeWidth={2.5} aria-hidden="true" />
                {t("Add another member")}
              </button>
            </div>
          </div>
        </div>
        {membersError && (
          <span role="alert" className="text-[12.5px] text-expense">
            {membersError}
          </span>
        )}
        <span className="text-caption leading-normal text-ink-muted">{t("Editor: adds money entries in their own name and keeps group cash. Viewer: sees everything, changes nothing. You can change all of this later in Members.")}</span>
      </div>

      <div className="flex gap-2.5 rounded-[12px] border border-emerald-line/60 bg-emerald-wash px-3.5 py-3 text-[12.5px] leading-normal text-ink-2">
        <Info className="mt-px size-4 shrink-0 text-emerald" aria-hidden="true" />
        <span>{t("We add 9 common categories (Bazar, Rent, Bills and more). You can rename, hide or add categories later.")}</span>
      </div>
    </GroupDialog>
  );
}
