"use client";

import { Building2, Check, House, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GroupKind } from "@/lib/customer/api";
import { createBusinessAction } from "@/lib/customer/businessActions";
import { countLabel } from "@/lib/customer/groupDisplay";
import { createGroupMemberAction, getGroupExpenseCategoriesAction, updateGroupExpenseCategoryAction, updateGroupSettingsAction } from "@/lib/customer/groupExpensesActions";
import { toBanglaDigits } from "@/lib/i18n/banglaDates";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { attempt } from "./attempt";
import { CloseX, FOCUS_WITHIN } from "./GroupBits";

interface NewGroupDrawerProps {
  open: boolean;
  onClose: () => void;
}

// What each kind of group starts with (all of it can change in Settings).
const STARTS: Record<GroupKind, string[]> = {
  MESS: ["Meals: breakfast ½, lunch 1, dinner 1", "Bazar shared by meals; rent, bills, wifi and maid equally", "One open month at a time, closed by you"],
  FAMILY: ["Bazar shared by family size, set as each member's shares", "Rent, bills and the rest shared equally", "One open month at a time, closed by you"],
};
const KINDS = [
  { value: "FAMILY" as const, title: "Family", sub: "Bazar by family size, bills equally.", icon: House, tile: "bg-pillar-insights-soft text-pillar-insights" },
  { value: "MESS" as const, title: "Mess", sub: "Meals counted, bazar by meal rate.", icon: Building2, tile: "bg-warning-soft text-warning" },
];
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

// A new group in the design's drawer: its name, the members as chips, and
// whether you are one of them. The group is created, then each member
// added, and the page moves into the group's first steps.
export function NewGroupDrawer({ open, onClose }: NewGroupDrawerProps) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [name, setName] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [includeMe, setIncludeMe] = useState(true);
  const [kind, setKind] = useState<GroupKind>("FAMILY");
  const [startDay, setStartDay] = useState(1);
  // The member who keeps the cash, by name; "" for no one in particular,
  // null for the default (you, when you are in it).
  const [holder, setHolder] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Each time it opens, a fresh group: nothing from the last attempt.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName("");
      setNames([]);
      setDraft("");
      setIncludeMe(true);
      setKind("FAMILY");
      setStartDay(1);
      setHolder(null);
    }
  }

  const me = user.name.trim();
  const everyone = includeMe && me ? [me, ...names.filter((n) => n.toLowerCase() !== me.toLowerCase())] : names;
  // A holder who was taken off the list falls back to the default.
  const holderName = holder !== null && (holder === "" || everyone.includes(holder)) ? holder : includeMe && me ? me : "";

  function addDraft() {
    const value = draft.trim();
    if (!value) return;
    if (!names.some((n) => n.toLowerCase() === value.toLowerCase())) setNames([...names, value]);
    setDraft("");
  }

  function onDraftKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addDraft();
    } else if (event.key === "Backspace" && draft === "" && names.length > 0) {
      setNames(names.slice(0, -1));
    }
  }

  const valid = name.trim().length > 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const offline = t("No connection. Nothing was saved; try again.");
      const created = await attempt(() => createBusinessAction({ name: name.trim(), currency: "BDT", type: "GROUP" }), offline);
      if (!created.success || !created.data) {
        toast.error(created.message ?? t("Failed to create the group"));
        return;
      }
      const businessId = created.data.id;
      const members = everyone.length > 0 ? everyone : draft.trim() ? [draft.trim()] : [];
      const results = await Promise.all(members.map((memberName) => attempt(() => createGroupMemberAction(businessId, { name: memberName }), offline)));
      const failed = results.filter((r) => !r.success).length;
      const cashHolder = results.find((r, i) => r.success && members[i] === holderName)?.data?.id ?? null;
      const settingsSaved = await attempt(() => updateGroupSettingsAction(businessId, { kind, monthStartDay: startDay, mealsOn: kind === "MESS", cashHolderMemberId: cashHolder }), offline);
      // The bazar is shared by meals in a mess, by family size in a family.
      const categories = await attempt(() => getGroupExpenseCategoriesAction(businessId), offline);
      const bazar = categories.data?.find((c) => /bazar|grocery/i.test(c.name));
      const splitSaved = !categories.success ? categories : bazar ? await attempt(() => updateGroupExpenseCategoryAction(businessId, bazar.id, { defaultSplit: kind === "MESS" ? "MEALS" : "SHARES" }), offline) : { success: true };
      if (failed > 0) toast.warning(countLabel(t, locale, failed, "{count} member could not be added", "{count} members could not be added"));
      // The group is there either way; a group left as a family with no meal
      // counting must not pass for the mess that was asked for.
      if (!settingsSaved.success || !splitSaved.success) toast.warning(t("Group created, but its settings didn't save. Set them in Settings."));
      else toast.success(t("Group created"));
      onClose();
      router.push(`/group-expenses/${created.data.id}`);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-120 shadow-drawer data-[side=right]:sm:max-w-120" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{t("New group")}</SheetTitle>
          <CloseX onClick={onClose} disabled={isPending} />
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <Field htmlFor="ng-name" label={t("Group name")} hint={t("For example: {examples}", { examples: "আমাদের মেস, বাসা ৩২, Mirpur Family" })}>
              <Input id="ng-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder="Uttara Mess" aria-describedby="ng-name-hint" />
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("What kind of group is it?")}</legend>
              <div className="grid grid-cols-2 gap-3">
                {KINDS.map((option) => {
                  const on = option.value === kind;
                  return (
                    <label key={option.value} className={cn("relative flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-4 text-left", FOCUS_WITHIN, on ? "border-[1.5px] border-emerald bg-mint-50" : "border-line bg-surface hover:border-line-strong")}>
                      <input type="radio" name="ng-kind" value={option.value} checked={on} onChange={() => setKind(option.value)} className="sr-only" />
                      {on && (
                        <span aria-hidden="true" className="absolute top-3 right-3 flex size-4.5 items-center justify-center rounded-full bg-emerald text-on-action">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      )}
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true" className={cn("flex size-7.5 items-center justify-center rounded-md [&_svg]:size-4", option.tile)}>
                          <option.icon />
                        </span>
                        <span className={cn("text-body-lg text-ink", on ? "font-bold" : "font-semibold")}>{t(option.title)}</span>
                      </span>
                      <span className={cn("text-small leading-normal", on ? "text-ink-2" : "text-ink-muted")}>{t(option.sub)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <span className="text-body font-medium text-ink">{t("Members")}</span>
              <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-md border border-line-strong bg-surface px-3 py-2 focus-within:border-emerald focus-within:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]">
                {everyone.map((memberName) => {
                  const isMe = includeMe && memberName === me;
                  return (
                    <span key={memberName} className="flex h-7.5 items-center gap-2 rounded-full bg-surface-sunken py-0 pr-2 pl-1 text-small font-medium text-ink">
                      <PersonAvatar name={memberName} size={22} coloured />
                      {memberName}
                      {isMe && <span className="text-ink-muted">({t("you")})</span>}
                      {/* A 20px button with a 36px (44px under a finger) reach around it. */}
                      <button
                        type="button"
                        onClick={() => (isMe ? setIncludeMe(false) : setNames(names.filter((n) => n !== memberName)))}
                        aria-label={t("Remove {name}", { name: memberName })}
                        className="relative flex size-5 items-center justify-center rounded-full text-ink-muted after:absolute after:-inset-2 hover:bg-line hover:text-ink pointer-coarse:after:-inset-3"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
                <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onDraftKey} onBlur={addDraft} aria-label={t("Add a member by name")} placeholder={t("Type a name, press Enter")} className="h-7.5 min-w-37.5 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted" />
              </div>
              {me && (
                <label className={cn("flex cursor-pointer items-center gap-3 self-start rounded-sm text-small text-ink-2", FOCUS_WITHIN)}>
                  <input type="checkbox" checked={includeMe} onChange={(event) => setIncludeMe(event.target.checked)} className="sr-only" />
                  <span aria-hidden="true" className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border transition-colors", includeMe ? "border-emerald bg-emerald text-on-action" : "border-line-strong bg-surface")}>
                    {includeMe && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  {t("I'm part of this group too (added as {name})", { name: me })}
                </label>
              )}
              <span className="text-caption font-normal text-ink-muted">{t("You can add phone numbers and photos later. Members don't need their own login: you record contributions, expenses and meals for them.")}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field htmlFor="ng-start" label={t("Month starts on")}>
                <NativeSelect id="ng-start" size="md" value={startDay} onChange={(event) => setStartDay(Number(event.target.value))} frameClassName="w-full" className="font-normal">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {t("{day} of each month", { day: locale === "bn" ? toBanglaDigits(day) : ordinal(day) })}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field htmlFor="ng-cash" label={t("Manager (keeps the cash)")}>
                <NativeSelect id="ng-cash" size="md" value={holderName} onChange={(event) => setHolder(event.target.value)} frameClassName="w-full" className="font-normal">
                  <option value="">{t("No one in particular")}</option>
                  {everyone.map((memberName) => (
                    <option key={memberName} value={memberName}>
                      {memberName}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <div className="flex flex-col gap-3 rounded-md border border-line bg-strip p-4">
              <span className="text-small font-semibold text-ink-2">{t(kind === "MESS" ? "A mess group starts with" : "A family group starts with")}</span>
              {STARTS[kind].map((line) => (
                <span key={line} className="flex items-start gap-2 text-small text-ink-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald" aria-hidden="true" />
                  {t(line)}
                </span>
              ))}
              <span className="text-caption font-normal text-ink-muted">{t("All of it can be changed later in Settings.")}</span>
            </div>
          </div>

          <div className={cn("flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 py-3")}>
            {/* Below md the X closes the sheet. */}
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="hidden md:inline-flex">
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5 max-sm:w-full">
              {isPending && <Loader />}
              {t("Create group")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
