"use client";

import { Check, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { GroupMemberRole } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { createBusinessAction } from "@/lib/customer/businessActions";
import { countLabel } from "@/lib/customer/groupDisplay";
import { createGroupMemberAction, setupGroupCategoriesAction } from "@/lib/customer/groupExpensesActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GroupDialog } from "./GroupDialog";
import { MemberAvatar } from "./GroupBits";

interface NewGroupDialogProps {
  open: boolean;
  onClose: () => void;
  // The other groups' names: a new one can't repeat them.
  takenNames: string[];
}

// What a family usually spends on, all on to start with.
const STARTER_CATEGORIES = ["Bazar & grocery", "Rent", "Utility", "Medicine", "Maid", "Internet", "Education", "Transport", "Other"];
const MAX_ACCOUNTANTS = 2;
const STEP_NAMES = ["Name", "Members", "Categories"] as const;

interface Person {
  key: string;
  name: string;
  role: GroupMemberRole;
}

// A new family group (the v7 board's 3-step dialog): its name; its
// members, you first, each a member or an accountant (up to two keep the
// cash); and the categories it spends on. The group, its members and its
// categories are then made in one go.
export function NewGroupDialog({ open, onClose, takenNames }: NewGroupDialogProps) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [draft, setDraft] = useState("");
  const [draftRole, setDraftRole] = useState<GroupMemberRole>("MEMBER");
  const [picked, setPicked] = useState<string[]>(STARTER_CATEGORIES);
  const [extra, setExtra] = useState<string[]>([]);
  const [customDraft, setCustomDraft] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const me = user.name.trim() || t("You");

  // Each time it opens, a fresh group: nothing from the last attempt.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStep(1);
      setName("");
      setPeople([{ key: "me", name: me, role: "ACCOUNTANT" }]);
      setDraft("");
      setDraftRole("MEMBER");
      setPicked(STARTER_CATEGORIES);
      setExtra([]);
      setCustomDraft("");
      setError("");
    }
  }

  const accountants = people.filter((person) => person.role === "ACCOUNTANT").length;
  const all = [...STARTER_CATEGORIES, ...extra];

  function addPerson() {
    const value = draft.trim();
    if (!value) return;
    if (people.some((person) => person.name.toLowerCase() === value.toLowerCase())) return setError(t("{name} is already in the list.", { name: value }));
    if (draftRole === "ACCOUNTANT" && accountants >= MAX_ACCOUNTANTS) return setError(t("A family can have up to 2 accountants."));
    setPeople([...people, { key: `p:${value.toLowerCase()}`, name: value, role: draftRole }]);
    setDraft("");
    setDraftRole("MEMBER");
    setError("");
  }

  function setRole(key: string, role: GroupMemberRole) {
    if (role === "ACCOUNTANT" && accountants >= MAX_ACCOUNTANTS && people.find((person) => person.key === key)?.role !== "ACCOUNTANT") return setError(t("A family can have up to 2 accountants."));
    setPeople(people.map((person) => (person.key === key ? { ...person, role } : person)));
    setError("");
  }

  function addCategory() {
    const value = customDraft.trim();
    if (!value) return;
    if (all.some((existing) => existing.toLowerCase() === value.toLowerCase())) return setError(t("{name} is already there.", { name: value }));
    setExtra([...extra, value]);
    setPicked([...picked, value]);
    setCustomDraft("");
    setError("");
  }

  const toggleCategory = (value: string) => setPicked(picked.includes(value) ? picked.filter((item) => item !== value) : [...picked, value]);

  function next() {
    if (step === 1) {
      const trimmed = name.trim();
      if (!trimmed) return setError(t("Give the group a name."));
      if (takenNames.some((taken) => taken.trim().toLowerCase() === trimmed.toLowerCase())) return setError(t("Another group already has this name."));
    }
    if (step === 2) {
      if (draft.trim()) return addPerson();
      if (people.length < 2) return setError(t("Add at least one member besides you."));
    }
    setError("");
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (picked.length === 0) return setError(t("Keep at least one category."));
    create();
  }

  function create() {
    startTransition(async () => {
      const offline = t(OFFLINE_MESSAGE), stale = t(STALE_MESSAGE);
      const created = await attempt(() => createBusinessAction({ name: name.trim(), currency: "BDT", type: "GROUP" }), offline, stale);
      if (!created.success || !created.data) {
        toast.error(created.message ?? t("Failed to create the group"));
        return;
      }
      const businessId = created.data.id;
      // One at a time, you first: the first accountant becomes the one who
      // keeps the cash.
      let failed = 0;
      for (const person of people) {
        const result = await attempt(() => createGroupMemberAction(businessId, { name: person.name, role: person.role, ...(person.key === "me" && { isOwner: true }) }), offline, stale);
        if (!result.success) failed++;
      }
      const chosen = all.filter((category) => picked.includes(category));
      const categories = await attempt(() => setupGroupCategoriesAction(businessId, chosen.map((category) => ({ name: category }))), offline, stale);
      if (failed > 0) toast.warning(countLabel(t, fmt, failed, "{count} member could not be added", "{count} members could not be added"));
      if (!categories.success) toast.warning(t("Group created, but its categories didn't save. Add them in Categories."));
      else if (failed === 0) toast.success(t("Group created"));
      onClose();
      router.push(`/group-expenses/${businessId}`);
      router.refresh();
    });
  }

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={620}
      title={t("New group")}
      sub={t("Step {step} of 3 · {name}", { step: formatCount(step, fmt), name: t(STEP_NAMES[step - 1]) })}
      onSubmit={(event) => {
        event.preventDefault();
        next();
      }}
      footer={
        <>
          {step > 1 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setError("");
                setStep(step - 1);
              }}
              disabled={isPending}
              className="mr-auto"
            >
              {t("← Back")}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader />}
            {step === 3 ? t("Create group") : t("Next →")}
          </Button>
        </>
      }
    >
      <ol aria-label={t("Steps")} className="grid grid-cols-3 gap-3">
        {STEP_NAMES.map((label, index) => {
          const number = index + 1;
          const done = number < step;
          const current = number === step;
          return (
            <li key={label} aria-current={current ? "step" : undefined} className="flex flex-col gap-2">
              <span className={cn("h-1 rounded-full", done || current ? "bg-emerald" : "bg-surface-sunken")} />
              <span className="flex items-center gap-2 text-small">
                <span className={cn("flex size-5.5 items-center justify-center rounded-full text-caption font-bold", done ? "bg-emerald text-white" : current ? "bg-emerald text-white" : "bg-surface-sunken text-ink-muted")}>{done ? <Check className="size-3" strokeWidth={3} aria-hidden="true" /> : formatCount(number, fmt)}</span>
                <span className={cn(current ? "font-semibold text-ink" : "text-ink-muted")}>{t(label)}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <Field htmlFor="ng-name" label={<span className="text-body font-medium text-ink">{t("Group name")}</span>} hint={t("Just a name your family will recognise. You can rename it any time.")}>
          <Input id="ng-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder={t("e.g. Mirpur Family")} invalid={!!error} aria-describedby="ng-name-hint" />
        </Field>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Input
              size="md"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addPerson();
                }
              }}
              placeholder={t("Member's name")}
              aria-label={t("Member name")}
              maxLength={80}
              autoFocus
              frameClassName="min-w-0 flex-1"
            />
            <NativeSelect size="md" value={draftRole} onChange={(event) => setDraftRole(event.target.value as GroupMemberRole)} aria-label={t("Designation")} frameClassName="w-42.5">
              <option value="MEMBER">{t("Member")}</option>
              <option value="ACCOUNTANT">{t("Accountant")}</option>
            </NativeSelect>
            <Button type="button" variant="secondary" onClick={addPerson} disabled={!draft.trim()}>
              <Plus aria-hidden="true" />
              {t("Add")}
            </Button>
          </div>
          <div className="flex flex-col overflow-hidden rounded-field border border-line">
            {people.map((person) => (
              <div key={person.key} className="flex items-center gap-3 border-b border-divider px-3.5 py-2.5 last:border-b-0">
                <MemberAvatar member={{ id: person.key, name: person.name, photoUrl: null }} members={people.map((p) => ({ id: p.key }))} size={32} />
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate font-semibold text-ink">{person.key === "me" ? t("{name} (you)", { name: person.name }) : person.name}</span>
                  <span className="truncate text-caption text-ink-muted">{person.key === "me" ? t("Owner · that's you") : person.role === "ACCOUNTANT" ? t("Keeps the family cash") : t("Gives money to the accountant")}</span>
                </span>
                <SegmentedControl<GroupMemberRole>
                  options={[
                    { value: "MEMBER", label: "Member" },
                    { value: "ACCOUNTANT", label: "Accountant" },
                  ]}
                  value={person.role}
                  onChange={(role) => setRole(person.key, role)}
                  label={t("Role")}
                  variant="pill"
                  className="rounded-[9px] [&>button]:h-7.5 [&>button]:px-2.5 [&>button]:text-caption"
                />
                {person.key === "me" ? (
                  <span className="size-8" />
                ) : (
                  <button type="button" onClick={() => setPeople(people.filter((item) => item.key !== person.key))} aria-label={t("Remove {name}", { name: person.name })} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-small text-ink-muted">{t("Accountants keep the family cash and do the bazar (up to 2). You record everything for them.")}</p>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <p className="text-small text-ink-2">{t("Pick what this family spends on. Tap to turn on or off.")}</p>
          <div className="flex flex-wrap gap-2">
            {all.map((category) => {
              const on = picked.includes(category);
              return (
                <button key={category} type="button" aria-pressed={on} onClick={() => toggleCategory(category)} className={cn("flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-small transition-colors", on ? "border-emerald bg-emerald-soft font-semibold text-emerald" : "border-line bg-surface text-ink-2 hover:border-input")}>
                  {on && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                  {t(category)}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              size="md"
              value={customDraft}
              onChange={(event) => setCustomDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCategory();
                }
              }}
              placeholder={t("Add your own, e.g. School fees")}
              aria-label={t("Add your own category")}
              maxLength={60}
              frameClassName="min-w-0 flex-1"
            />
            <Button type="button" variant="secondary" onClick={addCategory} disabled={!customDraft.trim()}>
              <Plus aria-hidden="true" />
              {t("Add")}
            </Button>
          </div>
          <p className="text-caption text-ink-muted">{t("{count} selected. You can change categories later.", { count: formatCount(picked.length, fmt) })}</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-small font-semibold text-expense">
          {error}
        </p>
      )}
    </GroupDialog>
  );
}
