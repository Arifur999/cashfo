"use client";

import { Check, Copy, Info, MessageCircle, MessageSquare, Plus, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import IconTile from "@/components/smartly/IconTile";
import type { GroupAccessLink, GroupKind, GroupMemberRole, GroupSplit } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { createBusinessAction } from "@/lib/customer/businessActions";
import { countLabel } from "@/lib/customer/groupDisplay";
import { createGroupAccessLinkAction, createGroupMemberAction, setGroupCostSplitAction, setupGroupCategoriesAction, updateGroupSettingsAction } from "@/lib/customer/groupExpensesActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { type AccessLinkShown, joinUrl, linkMessage, whatsappNumber } from "./AccessLinkDialog";
import { GROUP_KIND } from "./GroupBits";
import { GroupDialog } from "./GroupDialog";

interface NewGroupDialogProps {
  open: boolean;
  onClose: () => void;
  // The other groups' names: a new one can't repeat them.
  takenNames: string[];
}

// What a group usually spends on: all nine to start with (hidden or renamed
// later in Categories). A family shares its bazar by shares, a mess
// everything equally.
const STARTER_CATEGORIES = ["Bazar & grocery", "Rent", "Utility", "Medicine", "Maid", "Internet", "Education", "Transport", "Other"];
const KIND_HINTS: Record<GroupKind, string> = { FAMILY: "Bazar by family size, bills equally", MESS: "Everything shared equally" };
// Up to two people keep the group cash (the API's limit on accountants).
const MAX_EDITORS = 2;
const COLUMNS = "grid-cols-[minmax(0,1fr)_136px_64px_128px_120px_34px]";

interface Row {
  key: string;
  name: string;
  phone: string;
  shares: string;
  role: GroupMemberRole;
}

const blankRow = (index: number): Row => ({ key: `r${index}:${Date.now()}`, name: "", phone: "", shares: "1", role: "MEMBER" });
// An 11-digit Bangladeshi mobile number, from what was typed ("" when blank).
const mobileOf = (raw: string): string | null => {
  const digits = raw.replace(/[\s-]/g, "").replace(/^\+?88/, "");
  if (!digits) return "";
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
};
const sharesOf = (raw: string): number | null => (/^\d{1,2}$/.test(raw.trim()) && Number(raw) >= 1 && Number(raw) <= 50 ? Number(raw) : null);

// Shares as percents (hundredths, the last taking the rounding): 3:1:4 is
// 37.5% · 12.5% · 50%.
function percentsOf(shares: number[]): number[] {
  const total = shares.reduce((sum, value) => sum + value, 0);
  const hundredths = shares.map((value) => Math.floor((value * 10000) / total));
  hundredths[hundredths.length - 1] += 10000 - hundredths.reduce((sum, value) => sum + value, 0);
  return hundredths.map((value) => value / 100);
}

// A new group (the v16 GroupList board's New group popup): its name and
// kind, then everyone who shares the costs in one table -- you first, as
// its Admin -- with each one's phone, shares and access (Editor, Viewer or
// none). Creating it makes the group, its members, the nine categories and
// the cost split by shares, then an access link for everyone given access,
// shown once to send by SMS or WhatsApp.
export function NewGroupDialog({ open, onClose, takenNames }: NewGroupDialogProps) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<GroupKind>("FAMILY");
  const [ownShares, setOwnShares] = useState("1");
  const [rows, setRows] = useState<Row[]>([]);
  const [tried, setTried] = useState(false);
  const [isPending, startTransition] = useTransition();
  // After Create: the links to send, and the group they open.
  const [links, setLinks] = useState<{ businessId: string; groupName: string; list: AccessLinkShown[] } | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
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
      setTried(false);
      setLinks(null);
      setCopied(null);
    }
  }

  const updateRow = (key: string, patch: Partial<Row>) => setRows(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const editors = rows.filter((row) => row.role === "ACCOUNTANT").length;

  // What is wrong, said under the field it is about.
  const trimmed = name.trim();
  const nameError = !trimmed ? t("Give the group a name.") : takenNames.some((taken) => taken.trim().toLowerCase() === trimmed.toLowerCase()) ? t("You already have a group with this name.") : null;
  const ownSharesBad = sharesOf(ownShares) === null;
  const filled = rows.filter((row) => row.name.trim() || row.phone.trim());
  const rowProblem = (row: Row): { field: "name" | "phone" | "shares"; message: string } | null => {
    if (!row.name.trim() && !row.phone.trim()) return null;
    if (!row.name.trim()) return { field: "name", message: t("Write the member’s name.") };
    const phone = mobileOf(row.phone);
    if (phone === null) return { field: "phone", message: t("Use an 11-digit mobile number, like 01819-205377.") };
    if (!phone && row.role !== "MEMBER") return { field: "phone", message: t("An access link needs a mobile number.") };
    if (phone && filled.some((other) => other.key !== row.key && mobileOf(other.phone) === phone)) return { field: "phone", message: t("This number is already in the group.") };
    if (sharesOf(row.shares) === null) return { field: "shares", message: t("Shares must be a whole number from 1 to 50.") };
    return null;
  };
  const membersError = filled.length === 0 ? t("Add at least one more member.") : editors > MAX_EDITORS ? t("Up to 2 Editors keep the group cash.") : null;
  const valid = !nameError && !ownSharesBad && !membersError && filled.every((row) => rowProblem(row) === null);

  function create() {
    setTried(true);
    if (!valid || isPending) return;
    startTransition(async () => {
      const offline = t(OFFLINE_MESSAGE), stale = t(STALE_MESSAGE);
      const created = await attempt(() => createBusinessAction({ name: trimmed, currency: "BDT", type: "GROUP" }), offline, stale);
      if (!created.success || !created.data) {
        toast.error(created.message ?? t("Failed to create the group"));
        return;
      }
      const businessId = created.data.id;
      if (kind === "MESS") await attempt(() => updateGroupSettingsAction(businessId, { kind: "MESS" }), offline, stale);
      // You first: you keep the group cash unless two Editors do.
      const people = [
        { name: me, phone: undefined as string | undefined, shares: sharesOf(ownShares) ?? 1, role: (editors >= MAX_EDITORS ? "MEMBER" : "ACCOUNTANT") as GroupMemberRole, owner: true },
        ...filled.map((row) => ({ name: row.name.trim(), phone: mobileOf(row.phone) || undefined, shares: sharesOf(row.shares) ?? 1, role: row.role, owner: false })),
      ];
      let failed = 0;
      const made: { id: string; shares: number; row: (typeof people)[number] }[] = [];
      for (const person of people) {
        const result = await attempt(() => createGroupMemberAction(businessId, { name: person.name, ...(person.phone && { phone: person.phone }), shareUnits: person.shares, role: person.role, ...(person.owner && { isOwner: true }) }), offline, stale);
        if (result.success && result.data) made.push({ id: result.data.id, shares: person.shares, row: person });
        else failed++;
      }
      const split = (category: string): GroupSplit => (kind === "FAMILY" && category === "Bazar & grocery" ? "SHARES" : "EQUAL");
      const categories = await attempt(() => setupGroupCategoriesAction(businessId, STARTER_CATEGORIES.map((category) => ({ name: category, defaultSplit: split(category) }))), offline, stale);
      // Unequal shares become the cost split, as percents.
      if (made.length > 1 && made.some((member) => member.shares !== made[0].shares)) {
        const percents = percentsOf(made.map((member) => member.shares));
        await attempt(() => setGroupCostSplitAction(businessId, { mode: "CUSTOM", members: made.map((member, index) => ({ groupMemberId: member.id, percent: percents[index] })) }), offline, stale);
      }
      // A link for everyone given access.
      const list: AccessLinkShown[] = [];
      for (const member of made.filter((entry) => !entry.row.owner && entry.row.role !== "MEMBER")) {
        const link = await attempt(() => createGroupAccessLinkAction(businessId, member.id, "JOIN"), offline, stale);
        if (link.success && link.data) list.push({ link: link.data as GroupAccessLink, name: member.row.name, phone: member.row.phone ?? null, roleLabel: t(member.row.role === "ACCOUNTANT" ? "Editor" : "Viewer"), groupName: trimmed });
        else failed++;
      }
      if (failed > 0) toast.warning(countLabel(t, fmt, failed, "{count} member or link could not be made. Finish it in Members.", "{count} members or links could not be made. Finish them in Members."));
      if (!categories.success) toast.warning(t("Group created, but its categories didn't save. Add them in Categories."));
      if (list.length > 0) {
        setLinks({ businessId, groupName: trimmed, list });
        return;
      }
      if (failed === 0) toast.success(t("Group created"));
      finish(businessId);
    });
  }

  function finish(businessId: string) {
    onClose();
    router.push(`/group-expenses/${businessId}`);
    router.refresh();
  }

  const copy = async (index: number, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(index);
    } catch {
      toast.error(t("Couldn’t copy. Select the text and copy it yourself."));
    }
  };

  if (links) {
    return (
      <GroupDialog
        open={open}
        onClose={() => finish(links.businessId)}
        width={620}
        title={
          <span className="flex flex-col items-start gap-2">
            <Chip tone="income" size="sm" className="gap-1 text-[12px]">
              <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              {t("Group created")}
            </Chip>
            {t("Send each person their access link")}
          </span>
        }
        sub={t("Each person opens their link and sets their own username and password. Nobody else ever sees the password.")}
        footer={<Button onClick={() => finish(links.businessId)}>{t("Done, set up the group")}</Button>}
      >
        {links.list.map((shown, index) => {
          const url = joinUrl(shown.link.token);
          const message = linkMessage(shown, url, t, fmt);
          const wa = whatsappNumber(shown.phone);
          return (
            <div key={shown.link.token} className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line px-3.5 py-3">
              <span className="flex min-w-0 flex-1 flex-col gap-0.75">
                <span className="truncate text-body font-semibold text-ink">{shown.name}</span>
                <span className="truncate text-[12.5px] text-ink-muted">
                  <span className="tabular-nums">{shown.phone}</span> · {shown.roleLabel}
                </span>
                <input readOnly aria-label={t("Access link for {name}", { name: shown.name })} value={url} onFocus={(event) => event.currentTarget.select()} className="mt-0.75 h-8 w-full rounded-lg border border-emerald-line bg-strip px-2.5 font-mono text-[12.5px] text-ink outline-none" />
              </span>
              <span className="flex gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => void copy(index, url)}>
                  {copied === index ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied === index ? t("Copied") : t("Copy")}
                </Button>
                {shown.phone && (
                  <Button asChild variant="secondary" size="sm">
                    <a href={`sms:${shown.phone}?body=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                      <MessageSquare aria-hidden="true" />
                      {t("Send by SMS")}
                    </a>
                  </Button>
                )}
                {wa && (
                  <Button asChild variant="soft" size="sm">
                    <a href={`https://wa.me/${wa}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle aria-hidden="true" />
                      {t("WhatsApp")}
                    </a>
                  </Button>
                )}
              </span>
            </div>
          );
        })}
        <p className="flex gap-2.5 rounded-xl border border-warning-line bg-warning-soft px-3.5 py-3 text-[12.5px] leading-normal text-warning-ink">
          <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
          {t("Send the links now. Later you can copy one again or make a new one from Members; each works once, for 7 days.")}
        </p>
      </GroupDialog>
    );
  }

  const show = (error: string | null) => (tried ? error : null);
  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={820}
      title={t("New group")}
      sub={t("You will be its Admin. Add the people who share the costs.")}
      onSubmit={(event) => {
        event.preventDefault();
        create();
      }}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending} className="px-5.5">
            {isPending && <Loader />}
            {t("Create group")}
          </Button>
        </>
      }
    >
      <Field htmlFor="ng-name" label={t("Group name")} error={show(nameError)}>
        <Input id="ng-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={40} placeholder={t("e.g. Mirpur Family")} invalid={!!show(nameError)} />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-semibold text-ink-2">{t("What kind of group?")}</legend>
        <div role="radiogroup" aria-label={t("What kind of group?")} className="grid grid-cols-2 gap-2">
          {(["FAMILY", "MESS"] as GroupKind[]).map((value) => {
            const look = GROUP_KIND[value];
            const on = kind === value;
            return (
              <button key={value} type="button" role="radio" aria-checked={on} onClick={() => setKind(value)} className={cn("flex min-h-16 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left", on ? "border-[1.5px] border-emerald bg-mint-50/60" : "border border-line bg-surface hover:border-mint-200")}>
                <IconTile tone={look.tone} size={36} className="size-8.5 rounded-[10px] [&_svg]:size-4.5">
                  <look.icon strokeWidth={1.9} />
                </IconTile>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-body font-semibold text-ink">{t(look.label)}</span>
                  <span className="text-[11.5px] leading-[1.35] text-ink-muted">{t(KIND_HINTS[value])}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2.5">
          <span className="text-small font-semibold text-ink-2">{t("Members")}</span>
          <span className="text-caption text-ink-muted">{t("Shares: how many people each member pays for (used for bazar in a family).")}</span>
        </div>
        <div className="overflow-x-auto rounded-[14px] border border-line">
          <div className="min-w-180">
            <div className={cn("grid gap-2 bg-strip px-3 py-2 text-[11.5px] font-semibold text-ink-muted", COLUMNS)}>
              <span>{t("Name")}</span>
              <span>{t("Phone")}</span>
              <span>{t("Shares")}</span>
              <span>{t("Access")}</span>
              <span>{t("Link")}</span>
              <span />
            </div>
            <div className={cn("grid items-center gap-2 border-t border-divider bg-strip/50 px-3 py-2", COLUMNS)}>
              <span className="truncate text-body font-semibold text-ink">
                {me} <span className="font-normal text-ink-muted">{t("(you)")}</span>
              </span>
              <span className="truncate text-[13.5px] text-ink-2 tabular-nums">{user.phone || "—"}</span>
              <Input size="sm" inputMode="numeric" value={ownShares} onChange={(event) => setOwnShares(event.target.value)} aria-label={t("Your shares")} invalid={tried && ownSharesBad} className="text-center" />
              <Chip tone="mint" className="justify-self-start">
                {t("Admin")}
              </Chip>
              <span className="text-caption text-ink-muted">{t("Your app login")}</span>
              <span />
            </div>
            {rows.map((row, index) => {
              const problem = tried ? rowProblem(row) : null;
              const label = row.name.trim() || t("Member {number}", { number: String(index + 1) });
              return (
                <div key={row.key} className="flex flex-col gap-1 border-t border-divider px-3 py-2">
                  <div className={cn("grid items-center gap-2", COLUMNS)}>
                    <Input size="sm" value={row.name} onChange={(event) => updateRow(row.key, { name: event.target.value })} maxLength={40} placeholder={t("Member’s name")} aria-label={t("{label}: name", { label })} invalid={problem?.field === "name"} />
                    <Input size="sm" type="tel" value={row.phone} onChange={(event) => updateRow(row.key, { phone: event.target.value })} maxLength={14} placeholder="01XXX-XXXXXX" aria-label={t("{label}: phone", { label })} invalid={problem?.field === "phone"} className="tabular-nums" />
                    <Input size="sm" inputMode="numeric" value={row.shares} onChange={(event) => updateRow(row.key, { shares: event.target.value })} aria-label={t("{label}: shares", { label })} invalid={problem?.field === "shares"} className="text-center" />
                    <NativeSelect size="sm" value={row.role} onChange={(event) => updateRow(row.key, { role: event.target.value as GroupMemberRole })} aria-label={t("{label}: access", { label })}>
                      <option value="MEMBER">{t("No access")}</option>
                      <option value="VIEWER">{t("Viewer")}</option>
                      <option value="ACCOUNTANT">{t("Editor")}</option>
                    </NativeSelect>
                    <span className={cn("text-[12.5px] font-semibold whitespace-nowrap", row.role === "MEMBER" ? "text-ink-faint" : "text-emerald")}>{row.role === "MEMBER" ? "–" : t("Link after create")}</span>
                    <button type="button" onClick={() => setRows(rows.filter((item) => item.key !== row.key))} aria-label={t("Remove {name}", { name: label })} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  {problem && (
                    <span role="alert" className="text-caption text-expense">
                      {problem.message}
                    </span>
                  )}
                </div>
              );
            })}
            <div className="border-t border-divider px-3 py-2">
              <button type="button" onClick={() => setRows([...rows, blankRow(rows.length)])} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-small font-semibold text-emerald hover:bg-mint-50">
                <Plus className="size-3.75" strokeWidth={2.5} aria-hidden="true" />
                {t("Add another member")}
              </button>
            </div>
          </div>
        </div>
        {show(membersError) && (
          <span role="alert" className="text-small text-expense">
            {membersError}
          </span>
        )}
        <p className="text-caption leading-normal text-ink-muted">{t("Editor: adds money entries in their own name and keeps group cash. Viewer: sees everything, changes nothing. A mobile number is needed only to send an access link. You can change all of this later in Members.")}</p>
      </div>

      <p className="flex gap-2.5 rounded-xl border border-emerald-line bg-mint-50/50 px-3.5 py-3 text-[12.5px] leading-normal text-ink-2">
        <Info className="mt-px size-4 shrink-0 text-emerald" aria-hidden="true" />
        {t("We add 9 common categories (Bazar, Rent, Bills and more). You can rename, hide or add categories later.")}
      </p>
    </GroupDialog>
  );
}
