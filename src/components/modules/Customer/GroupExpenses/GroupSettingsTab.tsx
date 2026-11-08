"use client";

import { CalendarClock, Coffee, Moon, Pause, Pencil, Plus, Sun, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createElement, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Switch } from "@/components/ui/switch";
import type { GroupExpenseCategoryOption, GroupKind, GroupSettings, GroupSplit } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { updateBusinessAction } from "@/lib/customer/businessActions";
import { budgetCategoryIcon, budgetCategoryIconLabel, suggestIconForCategoryName } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { categoryMembers, groupMonthOf, groupTabHref, monthRangeOf, rangeLabel, shortName, SPLITS } from "@/lib/customer/groupDisplay";
import { createGroupExpenseCategoryAction, updateGroupExpenseCategoryAction, updateGroupSettingsAction } from "@/lib/customer/groupExpensesActions";
import { costShares, isAccountant } from "@/lib/customer/groupFamily";
import { mealText, unitsOf } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CategoryMembersDialog } from "./CategoryMembersDialog";
import { SmallSwitch } from "../Settings/boardUi";
import { CategoryTile, MemberAvatar } from "./GroupBits";
import type { GroupPageData } from "./groupTypes";

interface GroupSettingsTabProps {
  data: GroupPageData;
  onCostSplit: () => void;
  onEditCategory: (category: GroupExpenseCategoryOption) => void;
  onRemoveCategory: (category: GroupExpenseCategoryOption) => void;
  onDeleteGroup: () => void;
}

type Section = "general" | "split" | "budget" | "categories" | "meals" | "pause";
type SettingsInput = Partial<Omit<GroupSettings, "breakfastUnits" | "lunchUnits" | "dinnerUnits" | "costSplit" | "pausedAt">> & { breakfastUnits?: number; lunchUnits?: number; dinnerUnits?: number; paused?: boolean };

// A category's ways of sharing, as Settings offers them: "By shares" is
// the group's cost split now.
const RULE_LABELS: Record<GroupSplit, string> = { EQUAL: "Equally", SHARES: "By cost split", MEALS: "By meals", EXACT: "Exact amounts" };
const WARN_CHOICES = ["80", "90", "100", ""] as const;

// "1st", "2nd", "21st"... for the month start picker.
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const MEAL_STEPS = [0, 0.5, 1, 1.5, 2];
// The new-category row's quick picks; Edit opens every icon and colour.
const NEW_ICONS = ["book-open", "bus", "shopping-cart", "house", "pill"];
const NEW_COLORS = ["amber", "green", "blue", "teal", "pink"];
// The category selects' own choices beside the ways of sharing.
const ONLY_SELECTED = "ONLY_SELECTED";
const CHANGE_MEMBERS = "CHANGE_MEMBERS";

// "Saving…", then "Saved" for a moment: a live region, so a screen reader
// hears it too. Always there, so nothing shifts.
function SaveStatus({ state }: { state: "saving" | "saved" | null }) {
  const { t } = useLocale();
  return (
    <span aria-live="polite" className="shrink-0 text-caption font-normal text-ink-muted">
      {/* "Saved@@status": the plain "Saved" is money put by (জমা) in Savings. */}
      {state === "saving" ? t("Saving…") : state === "saved" ? t("Saved@@status") : ""}
    </span>
  );
}

// The board's group settings: the name, whether it is a family or a mess,
// when its month starts and which accountant keeps the cash; how costs are
// split; the budget warning; how each category is shared; meal counting;
// and delete. Each change saves as it is made; its card says when, and its
// controls wait for the save.
export function GroupSettingsTab({ data, onCostSplit, onEditCategory, onRemoveCategory, onDeleteGroup }: GroupSettingsTabProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const [name, setName] = useState(data.name);
  const [nameKept, setNameKept] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState<Section | null>(null);
  const [saved, setSaved] = useState<Section | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A new start day waiting for its confirm.
  const [newStart, setNewStart] = useState<number | null>(null);
  const settings = data.settings;
  const units = unitsOf(settings);
  const active = data.members.filter((member) => member.status === "ACTIVE");
  const shares = costShares(data.members, settings);
  const custom = settings.costSplit === "CUSTOM";
  const hasAccountants = active.some(isAccountant);
  const warn = settings.budgetWarnPercent === undefined ? 90 : settings.budgetWarnPercent;
  // Hidden categories are on the Categories page; old records keep them.
  const shown = data.categories.filter((category) => !category.hidden);
  const [adding, setAdding] = useState(false);
  const dayWord = (day: number) => toLocaleDigits(locale === "bn" ? String(day) : ordinal(day), fmt);
  const status = (section: Section) => (saving === section ? "saving" : saved === section ? "saved" : null);
  // The new category being written at the foot of the list.
  const [newName, setNewName] = useState("");
  const [newSplit, setNewSplit] = useState<GroupSplit>("EQUAL");
  const [newIcon, setNewIcon] = useState<string | null>(null);
  const [newColor, setNewColor] = useState(NEW_COLORS[0]);
  // "Only selected" for the new category: the members ticked so far.
  const [newMembers, setNewMembers] = useState<string[]>([]);
  // The category whose sharers are being ticked ("new" for the one being written).
  const [pickingFor, setPickingFor] = useState<GroupExpenseCategoryOption | "new" | null>(null);
  // "Only selected" needs someone to leave out.
  const canPick = active.length > 1;
  const onlyLabel = (chosen: { name: string }[] | null) => (chosen ? t("Only selected · {names}", { names: chosen.map((member) => shortName(member.name)).join(", ") }) : t("Only selected…"));
  const icon = newIcon ?? suggestIconForCategoryName(newName) ?? NEW_ICONS[0];
  const splitChoices = SPLITS.filter((split) => split !== "EXACT" && (split !== "MEALS" || settings.mealsOn || settings.kind === "MESS"));
  const resetNew = () => {
    setAdding(false);
    setNewName("");
    setNewSplit("EQUAL");
    setNewIcon(null);
    setNewColor(NEW_COLORS[0]);
    setNewMembers([]);
  };
  // A way of sharing picked from a category's list: "Only selected" (and
  // "Change who shares") open the members; any other clears the chosen few.
  function pickSplit(category: GroupExpenseCategoryOption, value: string) {
    if (value === ONLY_SELECTED || value === CHANGE_MEMBERS) {
      setPickingFor(category);
      return;
    }
    run("categories", () => updateGroupExpenseCategoryAction(data.businessId, category.id, { defaultSplit: value as GroupSplit, defaultMemberIds: [] }), t("Failed to update category"));
  }
  function saveMembers(memberIds: string[]) {
    const target = pickingFor;
    setPickingFor(null);
    if (target === "new") {
      setNewMembers(memberIds);
      if (memberIds.length > 0) setNewSplit("EQUAL");
      return;
    }
    if (target) run("categories", () => updateGroupExpenseCategoryAction(data.businessId, target.id, { defaultSplit: "EQUAL", defaultMemberIds: memberIds }), t("Failed to update category"));
  }
  function addCategory() {
    const name = newName.trim();
    if (!name) return;
    if (data.categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      toast.error(t("A category with this name already exists."));
      return;
    }
    run(
      "categories",
      async () => {
        const result = await createGroupExpenseCategoryAction(data.businessId, { name, icon, color: newColor, defaultSplit: newSplit, ...(newMembers.length > 0 && { defaultMemberIds: newMembers }) });
        if (result.success) resetNew();
        return result;
      },
      t("Failed to create category"),
    );
  }

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  // A card's controls are disabled while it saves, which drops focus from
  // the one just used; it goes back there once they come back.
  const refocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (isPending || !refocus.current) return;
    const control = refocus.current;
    refocus.current = null;
    if (!document.activeElement || document.activeElement === document.body) control.focus();
  }, [isPending]);

  function run(section: Section, action: () => Promise<{ success: boolean; message?: string }>, failed: string) {
    refocus.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    setSaving(section);
    setSaved(null);
    startTransition(async () => {
      const result = await attempt(action, t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      setSaving(null);
      if (!result.success) {
        toast.error(result.message ?? failed);
        return;
      }
      setSaved(section);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(null), 2500);
      router.refresh();
    });
  }

  const save = (section: Section, input: SettingsInput) => run(section, () => updateGroupSettingsAction(data.businessId, input), t("Failed to save the settings"));

  // The name on its way to the server: Enter saves, and the blur that
  // follows (the field is disabled while saving) must not send it twice.
  const sentName = useRef<string | null>(null);

  function saveName() {
    const next = name.trim();
    // An empty name isn't saved: the old one comes back, and the field says why.
    if (!next) {
      setName(data.name);
      setNameKept(true);
      return;
    }
    if (next === data.name || next === sentName.current) return;
    sentName.current = next;
    run(
      "general",
      async () => {
        try {
          const result = await updateBusinessAction(data.businessId, { name: next });
          if (result.success) toast.success(t("Group renamed"));
          else sentName.current = null;
          return result;
        } catch (error) {
          sentName.current = null;
          throw error;
        }
      },
      t("Failed to rename the group"),
    );
  }

  // The open month is cut by the new day at once: say what it becomes.
  const startPreview = newStart === null ? null : monthRangeOf(groupMonthOf(data.today, newStart), newStart);

  const paused = !!data.settings.pausedAt;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[19px] font-semibold text-ink">{t("Group settings")}</h2>
        <p className="text-small text-ink-muted">{t("Name, first day of the month, budget warning, how costs and categories are shared, and pausing the group.")}</p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <Card padding="none" className="p-5">
            <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-title font-semibold text-ink">{t("General")}</h2>
                <SaveStatus state={status("general")} />
              </div>
              <Field htmlFor="gs-name" label={<span className="text-body font-medium text-ink">{t("Group name")}</span>} error={nameKept ? t("A group needs a name, so the old one was kept.") : undefined}>
                <Input
                  id="gs-name"
                  size="md"
                  value={name}
                  invalid={nameKept}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameKept(false);
                  }}
                  onBlur={saveName}
                  onKeyDown={(event) => event.key === "Enter" && saveName()}
                  maxLength={80}
                />
              </Field>
              <fieldset className="flex min-w-0 flex-col gap-2">
                <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("Kind of group")}</legend>
                <SegmentedControl<GroupKind>
                  options={[
                    { value: "FAMILY", label: "Family" },
                    { value: "MESS", label: "Mess" },
                  ]}
                  value={settings.kind}
                  onChange={(kind) => kind !== settings.kind && save("general", { kind })}
                  label="Kind of group"
                  stretch
                  className="[&>button]:h-8.5 [&>button]:disabled:opacity-60"
                />
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field htmlFor="gs-start" label={<span className="text-body font-medium text-ink">{t("Month starts on")}</span>}>
                  <NativeSelect id="gs-start" size="md" value={settings.monthStartDay} onChange={(event) => Number(event.target.value) !== settings.monthStartDay && setNewStart(Number(event.target.value))} frameClassName="w-full" className="font-normal" aria-describedby="gs-start-note">
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {t("{day} of each month", { day: dayWord(day) })}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field htmlFor="gs-cash" label={<span className="text-body font-medium text-ink">{t("Cash kept by")}</span>}>
                  <NativeSelect id="gs-cash" size="md" value={settings.cashHolderMemberId ?? ""} onChange={(event) => save("general", { cashHolderMemberId: event.target.value || null })} frameClassName="w-full" className="font-normal" aria-describedby="gs-cash-note">
                    {(!hasAccountants || !settings.cashHolderMemberId) && <option value="">{t("No one in particular")}</option>}
                    {active.map((member) => (
                      <option key={member.id} value={member.id}>
                        {isAccountant(member) ? t("{name} (accountant)", { name: member.name }) : member.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <span id="gs-start-note" className="text-caption leading-normal text-ink-muted">
                {t("Every month is counted from this day, the open one too. Entries keep their dates, and so do closed records.")}
              </span>
              <span id="gs-cash-note" className="text-caption leading-normal text-ink-muted">
                {t("Everyone settles with the one who keeps the cash. Picking someone who isn't an accountant makes them one (up to 2).")}
              </span>
            </fieldset>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
              <div className="flex flex-col gap-0.75">
                <h2 className="text-title font-semibold text-ink">{t("How costs are split")}</h2>
                <span className="text-small leading-normal text-ink-muted">{custom ? t('Custom %. Costs shared "by cost split" follow each member\'s percent.') : t('Equal. Costs shared "by cost split" are split the same for everyone.')}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={onCostSplit} className="h-9.5">
                {t("Change split")}
              </Button>
            </div>
            {active.map((member) => (
              <div key={member.id} className="flex min-h-14 items-center gap-3 border-t border-divider px-5 py-2">
                <MemberAvatar member={member} members={data.members} size={32} className="text-[11px]" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-semibold text-ink" title={member.name}>
                    {shortName(member.name)}
                  </span>
                  {(member.household || member.phone) && <span className="truncate text-caption text-ink-muted">{member.household || member.phone}</span>}
                </span>
                <span className="text-small font-semibold text-ink-2 tabular-nums">{shares[member.id] !== undefined ? `${formatCount(Math.round(shares[member.id] * 10) / 10, fmt)}%` : "—"}</span>
              </div>
            ))}
          </Card>

          <Card padding="none" className="flex flex-col gap-4 px-5 py-4.5">
            <div className="flex items-center gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                <span className="flex items-center justify-between gap-3">
                  <h2 className="text-title font-semibold text-ink">{t("Monthly budget")}</h2>
                  <SaveStatus state={status("budget")} />
                </span>
                <span className="text-small text-ink-muted">{t("Each month's budget is set on the Monthly budget page.")}</span>
              </div>
              <Button variant="secondary" size="sm" asChild className="h-9.5">
                <Link href={groupTabHref(data.businessId, "budget")}>{t("Set budgets")}</Link>
              </Button>
            </div>
            <Field htmlFor="gs-warn" label={<span className="text-body font-medium text-ink">{t("Warn me when this much of the budget is used")}</span>}>
              <NativeSelect id="gs-warn" size="md" value={warn === null ? "" : String(warn)} disabled={isPending} onChange={(event) => run("budget", () => updateGroupSettingsAction(data.businessId, { budgetWarnPercent: event.target.value ? Number(event.target.value) : null }), t("Failed to save the settings"))} frameClassName="w-full sm:w-60" className="font-normal">
                {WARN_CHOICES.map((choice) => (
                  <option key={choice || "never"} value={choice}>
                    {choice ? `${toLocaleDigits(choice, fmt)}%` : t("Never")}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card padding="none" className="overflow-hidden">
            <fieldset disabled={isPending} className="min-w-0">
              <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                <div className="flex flex-col gap-0.75">
                  <h2 className="text-title font-semibold text-ink">{t("Categories and how each is shared")}</h2>
                  <span className="text-small text-ink-muted">{t("The default for new expenses. Any single expense can still be changed.")}</span>
                </div>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {!adding && (
                    <Button variant="secondary" size="sm" onClick={() => setAdding(true)} className="h-9">
                      <Plus aria-hidden="true" />
                      {t("Add category")}
                    </Button>
                  )}
                  <SaveStatus state={status("categories")} />
                </span>
              </div>
              {shown.length === 0 && <p className="border-t border-divider px-5 py-5 text-center text-small text-ink-muted">{t("No category yet. Bazar, rent, bills… add the ones this group uses.")}</p>}
              {shown.map((category) => {
                const chosen = categoryMembers(category, active);
                return (
                <div key={category.id} className="flex min-h-12 items-center gap-3 border-t border-divider px-5 py-1.5">
                  <CategoryTile name={category.name} categories={data.categories} size={28} />
                  <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{category.name}</span>
                  <NativeSelect
                    size="sm"
                    value={chosen ? ONLY_SELECTED : category.defaultSplit}
                    onChange={(event) => pickSplit(category, event.target.value)}
                    aria-label={t("How {name} is shared", { name: category.name })}
                    frameClassName="max-w-48"
                    className={cn("h-8 truncate border-line text-[12.5px] font-semibold pointer-coarse:h-11", category.defaultSplit === "EQUAL" && !chosen ? "text-ink-2" : category.defaultSplit === "SHARES" ? "bg-pillar-insights-soft text-pillar-insights" : "bg-mint-50 text-brand-ink")}
                  >
                    {/* By meals stays offered to a category saved that way, and says what it does while meals aren't counted. */}
                    {SPLITS.filter((split) => split !== "EXACT" && (split !== "MEALS" || settings.mealsOn || settings.kind === "MESS" || category.defaultSplit === "MEALS")).map((split) => (
                      <option key={split} value={split}>
                        {split === "MEALS" && !settings.mealsOn ? t("By meals (shared equally while meal counting is off)") : t(RULE_LABELS[split])}
                      </option>
                    ))}
                    {(canPick || chosen) && <option value={ONLY_SELECTED}>{onlyLabel(chosen)}</option>}
                    {chosen && <option value={CHANGE_MEMBERS}>{t("Change who shares…")}</option>}
                  </NativeSelect>
                  <button type="button" onClick={() => onEditCategory(category)} aria-label={t("Edit {name}", { name: category.name })} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                    <Pencil className="size-3.75" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => onRemoveCategory(category)} aria-label={t("Delete {name}", { name: category.name })} className="-ml-2 flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-expense-soft hover:text-expense pointer-coarse:size-11">
                    <Trash2 className="size-3.75" aria-hidden="true" />
                  </button>
                </div>
                );
              })}
              {/* A new category, written in place once asked for. */}
              {adding && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  addCategory();
                }}
                className="flex flex-col gap-3 border-t border-line bg-strip px-5 py-3.5"
              >
                <label htmlFor="gs-new-cat" className="text-small font-semibold text-ink-2">
                  {t("New category")}
                </label>
                <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_210px]">
                  <Input id="gs-new-cat" size="sm" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={t("e.g. Kids' school")} maxLength={60} frameClassName="h-10" autoFocus />
                  <NativeSelect
                    size="sm"
                    value={newMembers.length > 0 ? ONLY_SELECTED : newSplit}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === ONLY_SELECTED || value === CHANGE_MEMBERS) {
                        setPickingFor("new");
                        return;
                      }
                      setNewMembers([]);
                      setNewSplit(value as GroupSplit);
                    }}
                    aria-label={t("How the new category is shared")}
                    frameClassName="w-full"
                    className="h-10 font-normal"
                  >
                    {splitChoices.map((split) => (
                      <option key={split} value={split}>
                        {t(RULE_LABELS[split])}
                      </option>
                    ))}
                    {canPick && <option value={ONLY_SELECTED}>{onlyLabel(newMembers.length > 0 ? active.filter((member) => newMembers.includes(member.id)) : null)}</option>}
                    {newMembers.length > 0 && <option value={CHANGE_MEMBERS}>{t("Change who shares…")}</option>}
                  </NativeSelect>
                </div>
                <div className="flex flex-wrap items-center gap-3.5">
                  <div role="radiogroup" aria-label={t("Icon")} className="flex gap-1.5">
                    {NEW_ICONS.map((key) => {
                      const on = key === icon;
                      return (
                        <button key={key} type="button" role="radio" aria-checked={on} aria-label={t(`${budgetCategoryIconLabel(key)}@@icon`)} onClick={() => setNewIcon(key)} className={cn("flex size-8 items-center justify-center rounded-full border pointer-coarse:size-11", on ? "border-warning-fill bg-warning-soft text-warning" : "border-line bg-surface text-ink-soft hover:border-input")}>
                          {createElement(budgetCategoryIcon(key), { className: "size-3.75", "aria-hidden": true })}
                        </button>
                      );
                    })}
                  </div>
                  <span className="h-6 w-px bg-line" aria-hidden="true" />
                  <div role="radiogroup" aria-label={t("Colour")} className="flex gap-1.5">
                    {NEW_COLORS.map((color) => {
                      const on = color === newColor;
                      return <button key={color} type="button" role="radio" aria-checked={on} aria-label={t(color)} onClick={() => setNewColor(color)} className={cn("size-5.5 rounded-full bg-current pointer-coarse:size-8", categoryTone(color).fg, on && "shadow-[0_0_0_2px_var(--strip),0_0_0_4px_currentColor]")} />;
                    })}
                  </div>
                  <span className="flex-1" />
                  <Button type="button" variant="ghost" size="sm" onClick={resetNew} className="h-8.5 px-2">
                    {t("Cancel")}
                  </Button>
                  <Button type="submit" size="sm" disabled={!newName.trim()} className="h-8.5">
                    {t("Add")}
                  </Button>
                </div>
              </form>
              )}
            </fieldset>
          </Card>

          <Card padding="none" className="p-5">
            <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                  <span className="flex items-center justify-between gap-3">
                    <h2 id="gs-meals" className="scroll-mt-4 text-title font-semibold text-ink">
                      {t("Meal counting")}
                    </h2>
                    <SaveStatus state={status("meals")} />
                  </span>
                  <span id="gs-meals-hint" className="text-small leading-normal text-ink-muted">
                    {settings.mealsOn ? t("On. Bazar is shared by the meals each person eats, like a mess.") : t("Off. Turn it on if bazar should be shared by the meals each person eats, like a mess.")}
                  </span>
                </div>
                <Switch checked={settings.mealsOn} onCheckedChange={(on) => save("meals", { mealsOn: on })} disabled={isPending} aria-labelledby="gs-meals" aria-describedby="gs-meals-hint" />
              </div>
              {settings.mealsOn && (
                <div className="flex flex-wrap items-center gap-3 border-t border-divider pt-4 text-small text-ink-2">
                  <span>{t("One meal counts as")}</span>
                  {(
                    [
                      { key: "breakfastUnits", label: "Breakfast", icon: Coffee, value: units.breakfast },
                      { key: "lunchUnits", label: "Lunch", icon: Sun, value: units.lunch },
                      { key: "dinnerUnits", label: "Dinner", icon: Moon, value: units.dinner },
                    ] as const
                  ).map((slot) => (
                    <label key={slot.key} className="flex items-center gap-1.5">
                      <slot.icon className="size-3.5 text-ink-muted" aria-hidden="true" />
                      {t(slot.label)}
                      <NativeSelect size="sm" value={slot.value} onChange={(event) => save("meals", { [slot.key]: Number(event.target.value) })} className="h-8 font-semibold pointer-coarse:h-11">
                        {MEAL_STEPS.map((step) => (
                          <option key={step} value={step}>
                            {mealText(step, fmt)}
                          </option>
                        ))}
                      </NativeSelect>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          </Card>

          <Card padding="none" className={cn("flex items-center gap-4 px-5 py-4.5", paused && "border-warning-line bg-warning-50")}>
            <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-field", paused ? "bg-warning-soft text-warning" : "bg-surface-sunken text-ink-2")}>
              <Pause className="size-4.5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.75">
              <h2 className="text-title font-semibold text-ink">{t("Pause group")}</h2>
              <span className="text-small leading-normal text-ink-muted">{paused ? t("The group is paused: new entries are off until you resume it. Everything stays visible.") : t("Stops new money entries for a while (for example during a long trip). Turn it off again any time.")}</span>
            </div>
            <SaveStatus state={status("pause")} />
            <SmallSwitch on={paused} label={t("Pause group")} disabled={isPending} onClick={() => save("pause", { paused: !paused })} />
          </Card>

          <Card padding="none" elevated={false} className="flex items-center gap-4 rounded-md border-expense-line px-5 py-4.5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.75">
              <h2 className="text-title font-semibold text-expense">{t("Delete this group")}</h2>
              <span className="text-small leading-normal text-ink-muted">{t("Removes {name} with every entry and closed month. This can't be undone.", { name: data.name })}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={onDeleteGroup} className="h-9.5 border-expense/40 text-expense hover:bg-expense-soft">
              {t("Delete group")}
            </Button>
          </Card>
        </div>

        <ConfirmDialog
          open={newStart !== null}
          onClose={() => setNewStart(null)}
          onConfirm={() => {
            if (newStart === null) return;
            save("general", { monthStartDay: newStart });
            // Back to the picker once saved, not to the dialog's button.
            refocus.current = document.getElementById("gs-start");
            setNewStart(null);
          }}
          icon={<CalendarClock />}
          danger={false}
          title={t("Start each month on the {day}?", { day: newStart === null ? "" : dayWord(newStart) })}
          description={
            startPreview
              ? t("{month} will run {range}. Entries keep their dates, so some move into the month before or after, and a closed month whose dates no longer match shows as open again.", {
                  month: monthName(startPreview.key, fmt, "long"),
                  range: rangeLabel(startPreview, fmt),
                })
              : ""
          }
          confirmLabel={t("Change the start day")}
        />
        <CategoryMembersDialog
          open={pickingFor !== null}
          category={pickingFor === "new" ? newName.trim() || t("New category") : (pickingFor?.name ?? "")}
          members={active}
          initial={pickingFor === "new" ? newMembers : ((pickingFor && categoryMembers(pickingFor, active)) ?? []).map((member) => member.id)}
          onClose={() => setPickingFor(null)}
          onSave={saveMembers}
        />
      </div>
    </div>
  );
}
