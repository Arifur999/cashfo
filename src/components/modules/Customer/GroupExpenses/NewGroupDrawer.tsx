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
import { createGroupMemberAction, getGroupExpenseCategoriesAction, updateGroupExpenseCategoryAction, updateGroupSettingsAction } from "@/lib/customer/groupExpensesActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

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
  const { t } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [name, setName] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [includeMe, setIncludeMe] = useState(true);
  const [kind, setKind] = useState<GroupKind>("FAMILY");
  const [startDay, setStartDay] = useState(1);
  // The name of the member who keeps the cash; "" for no one in particular.
  const [holder, setHolder] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName("");
      setNames([]);
      setDraft("");
      setIncludeMe(true);
    }
  }

  const me = user.name.trim();
  const everyone = includeMe && me ? [me, ...names.filter((n) => n.toLowerCase() !== me.toLowerCase())] : names;

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
      const created = await createBusinessAction({ name: name.trim(), currency: "BDT", type: "GROUP" });
      if (!created.success || !created.data) {
        toast.error(created.message ?? t("Failed to create the group"));
        return;
      }
      const businessId = created.data.id;
      const members = everyone.length > 0 ? everyone : draft.trim() ? [draft.trim()] : [];
      const results = await Promise.all(members.map((memberName) => createGroupMemberAction(businessId, { name: memberName })));
      const failed = results.filter((r) => !r.success).length;
      const cashHolder = results.find((r, i) => r.success && members[i] === (holder || (includeMe ? me : "")))?.data?.id ?? null;
      await updateGroupSettingsAction(businessId, { kind, monthStartDay: startDay, mealsOn: kind === "MESS", cashHolderMemberId: cashHolder });
      // The bazar is shared by meals in a mess, by family size in a family.
      const categories = await getGroupExpenseCategoriesAction(businessId);
      const bazar = categories.data?.find((c) => /bazar|grocery/i.test(c.name));
      if (bazar) await updateGroupExpenseCategoryAction(businessId, bazar.id, { defaultSplit: kind === "MESS" ? "MEALS" : "SHARES" });
      if (failed > 0) toast.warning(`${failed} ${t(failed === 1 ? "member could not be added" : "members could not be added")}`);
      toast.success(t("Group created"));
      onClose();
      router.push(`/group-expenses/${created.data.id}`);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-120 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-120" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{t("New group")}</SheetTitle>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <Field htmlFor="ng-name" label={t("Group name")} hint={`${t("For example")}: আমাদের মেস, বাসা ৩২, Mirpur Family`}>
              <Input id="ng-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder="Uttara Mess" />
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("What kind of group is it?")}</legend>
              <div role="radiogroup" className="grid grid-cols-2 gap-3">
                {KINDS.map((option) => {
                  const on = option.value === kind;
                  return (
                    <button key={option.value} type="button" role="radio" aria-checked={on} onClick={() => setKind(option.value)} className={cn("relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left", on ? "border-[1.5px] border-emerald bg-mint-50" : "border-line bg-surface hover:border-line-strong")}>
                      {on && (
                        <span className="absolute top-3 right-3 flex size-4.5 items-center justify-center rounded-full bg-emerald text-white">
                          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                        </span>
                      )}
                      <span className="flex items-center gap-2">
                        <span className={cn("flex size-7.5 items-center justify-center rounded-md [&_svg]:size-4", option.tile)}>
                          <option.icon aria-hidden="true" />
                        </span>
                        <span className={cn("text-body-lg text-ink", on ? "font-bold" : "font-semibold")}>{t(option.title)}</span>
                      </span>
                      <span className={cn("text-small leading-[1.45]", on ? "text-ink-2" : "text-ink-muted")}>{t(option.sub)}</span>
                    </button>
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
                      <button type="button" onClick={() => (isMe ? setIncludeMe(false) : setNames(names.filter((n) => n !== memberName)))} aria-label={`${t("Remove")} ${memberName}`} className="flex size-5 items-center justify-center rounded-full text-ink-muted hover:bg-line hover:text-ink">
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
                <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onDraftKey} onBlur={addDraft} aria-label={t("Add a member by name")} placeholder={t("Type a name, press Enter")} className="h-7.5 min-w-37.5 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted" />
              </div>
              {me && (
                <label className="flex cursor-pointer items-center gap-3 text-small text-ink-2">
                  <span role="checkbox" aria-checked={includeMe} tabIndex={0} onKeyDown={(event) => (event.key === " " || event.key === "Enter") && (event.preventDefault(), setIncludeMe(!includeMe))} onClick={() => setIncludeMe(!includeMe)} className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border transition-colors", includeMe ? "border-emerald bg-emerald text-white" : "border-line-strong bg-surface")}>
                    {includeMe && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                  </span>
                  {t("I'm part of this group too")} ({t("added as")} {me})
                </label>
              )}
              <span className="text-caption font-normal text-ink-muted">{t("You can add phone numbers and photos later. Members don't need their own login: you record contributions, expenses and meals for them.")}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field htmlFor="ng-start" label={t("Month starts on")}>
                <NativeSelect id="ng-start" size="md" value={startDay} onChange={(event) => setStartDay(Number(event.target.value))} frameClassName="w-full" className="font-normal">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {t("{day} of each month", { day: ordinal(day) })}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field htmlFor="ng-cash" label={t("Cash kept by")}>
                <NativeSelect id="ng-cash" size="md" value={holder || (includeMe ? me : "")} onChange={(event) => setHolder(event.target.value)} frameClassName="w-full" className="font-normal">
                  <option value="">{t("No one in particular")}</option>
                  {everyone.map((memberName) => (
                    <option key={memberName} value={memberName}>
                      {memberName} ({t("manager")})
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

          <div className={cn("flex items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 py-3")}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader />}
              {t("Create group")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
