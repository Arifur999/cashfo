"use client";

import { CalendarClock, Coffee, Info, Minus, Moon, Pause, Plus, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Switch } from "@/components/ui/switch";
import type { GroupKind, GroupSettings } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { updateBusinessAction } from "@/lib/customer/businessActions";
import { groupMonthOf, groupTabHref, monthRangeOf, rangeLabel } from "@/lib/customer/groupDisplay";
import { updateGroupMemberAction, updateGroupSettingsAction } from "@/lib/customer/groupExpensesActions";
import { isAccountant } from "@/lib/customer/groupFamily";
import { mealText, unitsOf } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { formatDay } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SmallSwitch } from "../Settings/boardUi";
import { MemberAvatar } from "./GroupBits";
import type { GroupPageData } from "./groupTypes";

interface GroupSettingsTabProps {
  data: GroupPageData;
  onCostSplit: () => void;
  onDeleteGroup: () => void;
}

type Section = "general" | "split" | "budget" | "categories" | "meals" | "pause";
type SettingsInput = Partial<Omit<GroupSettings, "breakfastUnits" | "lunchUnits" | "dinnerUnits" | "costSplit" | "pausedAt">> & { breakfastUnits?: number; lunchUnits?: number; dinnerUnits?: number; paused?: boolean };

// When the dashboard warns: at 80, 90 or 100% of the budget, or never.
const WARN_CHOICES = ["80", "90", "100", ""] as const;

// "1st", "2nd", "21st"... for the month start picker.
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const MEAL_STEPS = [0, 0.5, 1, 1.5, 2];

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
export function GroupSettingsTab({ data, onCostSplit, onDeleteGroup }: GroupSettingsTabProps) {
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
  const custom = settings.costSplit === "CUSTOM";
  const hasAccountants = active.some(isAccountant);
  const warn = settings.budgetWarnPercent === undefined ? 90 : settings.budgetWarnPercent;
  // Members' shares, edited here and saved together.
  const [shareDraft, setShareDraft] = useState<Record<string, number>>({});
  const draftTotal = active.reduce((sum, member) => sum + (shareDraft[member.id] ?? Number(member.shareUnits)), 0);
  const sharesChanged = active.some((member) => shareDraft[member.id] !== undefined && shareDraft[member.id] !== Number(member.shareUnits));
  function saveShares() {
    const changed = active.filter((member) => shareDraft[member.id] !== undefined && shareDraft[member.id] !== Number(member.shareUnits));
    run(
      "split",
      async () => {
        for (const member of changed) {
          const result = await updateGroupMemberAction(data.businessId, member.id, { shareUnits: shareDraft[member.id] });
          if (!result.success) return result;
        }
        setShareDraft({});
        return { success: true };
      },
      t("Failed to save the shares"),
    );
  }
  const owner = data.members.find((member) => member.isOwner);
  const firstDay = [...data.members].map((member) => (member.joinedOn ?? member.createdAt).slice(0, 10)).sort()[0];
  const logins = active.filter((member) => !!member.access?.login && !member.isOwner).length;
  const about: [string, string][] = [
    [t("Admin"), owner?.name ?? "—"],
    [t("Created on"), firstDay ? formatDay(firstDay, "d MMMM yyyy", fmt) : "—"],
    [t("Members"), t("{active} active · {count} can log in", { active: formatCount(active.length, fmt), count: formatCount(logins, fmt) })],
  ];
  const dayWord = (day: number) => toLocaleDigits(locale === "bn" ? String(day) : ordinal(day), fmt);
  const status = (section: Section) => (saving === section ? "saving" : saved === section ? "saved" : null);
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
        <p className="text-small text-ink-muted">{t("Name, first day of the month, budget warning, and each member’s shares.")}</p>
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
                    { value: "TRIP", label: "Trip" },
                    { value: "OFFICE", label: "Office" },
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
                <Field htmlFor="gs-warn" label={<span className="text-body font-medium text-ink">{t("Warn when the budget is used")}</span>}>
                  <NativeSelect id="gs-warn" size="md" value={warn === null ? "" : String(warn)} onChange={(event) => save("general", { budgetWarnPercent: event.target.value ? Number(event.target.value) : null })} frameClassName="w-full" className="font-normal" aria-describedby="gs-warn-note">
                    {WARN_CHOICES.map((choice) => (
                      <option key={choice || "never"} value={choice}>
                        {choice ? `${toLocaleDigits(choice, fmt)}%` : t("Never")}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <span id="gs-start-note" className="text-caption leading-normal text-ink-muted">
                {t("Every month is counted from this day, the open one too. Entries keep their dates, and so do closed records.")}
              </span>
              <span id="gs-warn-note" className="-mt-2 text-caption leading-normal text-ink-muted">
                {t("The dashboard turns amber at this point.")}
              </span>
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
              <span id="gs-cash-note" className="text-caption leading-normal text-ink-muted">
                {t("Everyone settles with the one who keeps the cash. Picking someone who isn't an accountant makes them one (up to 2).")}
              </span>
            </fieldset>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
              <div className="flex flex-col gap-0.75">
                <h2 className="text-title font-semibold text-ink">{t("Members’ shares")}</h2>
                <span className="text-small leading-normal text-ink-muted">{t("Used for costs shared “By shares”. For a family this is usually how many people each member feeds.")}</span>
              </div>
              <Button variant="secondary" size="sm" asChild className="h-9.5">
                <Link href={groupTabHref(data.businessId, "members")}>{t("Members & access")}</Link>
              </Button>
            </div>
            {active.map((member) => {
              const value = shareDraft[member.id] ?? Number(member.shareUnits);
              return (
                <div key={member.id} className="flex min-h-15 items-center gap-3 border-t border-divider px-5 py-2">
                  <MemberAvatar member={member} members={data.members} size={32} className="text-[11px]" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-semibold text-ink" title={member.name}>
                      {member.name}
                    </span>
                    {member.household && <span className="truncate text-caption text-ink-muted">{member.household}</span>}
                  </span>
                  <span className="flex h-11 items-center rounded-[10px] border border-line">
                    <button type="button" disabled={value <= 1 || isPending} onClick={() => setShareDraft({ ...shareDraft, [member.id]: value - 1 })} aria-label={t("Fewer shares for {name}", { name: member.name })} className="flex h-full w-9.5 items-center justify-center text-ink-2 disabled:text-ink-faint">
                      <Minus className="size-3.75" aria-hidden="true" />
                    </button>
                    <span className="w-9 text-center text-[15px] font-bold text-ink tabular-nums">{formatCount(value, fmt)}</span>
                    <button type="button" disabled={value >= 50 || isPending} onClick={() => setShareDraft({ ...shareDraft, [member.id]: value + 1 })} aria-label={t("More shares for {name}", { name: member.name })} className="flex h-full w-9.5 items-center justify-center text-ink-2 disabled:text-ink-faint">
                      <Plus className="size-3.75" aria-hidden="true" />
                    </button>
                  </span>
                  <span className="flex w-28 flex-col items-end">
                    <span className="text-small font-semibold text-ink tabular-nums">{draftTotal > 0 ? `${formatCount(Math.round((value / draftTotal) * 1000) / 10, fmt)}%` : "—"}</span>
                    <span className="text-caption text-ink-muted">{t("of By-shares costs")}</span>
                  </span>
                </div>
              );
            })}
            <div className="mx-5 mb-4 flex gap-2.5 rounded-[12px] border border-line bg-hover px-3.5 py-2.5 text-[12.5px] leading-normal text-ink-2">
              <Info className="mt-px size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span>
                {t("Changing shares changes how By-shares expenses are split from now on. Equal costs are not affected.")}{" "}
                {custom && (
                  <button type="button" onClick={onCostSplit} className="font-semibold text-emerald hover:underline">
                    {t("Custom percents")}
                  </button>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-divider bg-hover px-5 py-3">
              <span className="text-[13px] text-ink-muted">{t("{count} shares in total", { count: formatCount(draftTotal, fmt) })}</span>
              <Button size="lg" disabled={!sharesChanged || isPending} onClick={saveShares} className="px-4.5">
                {t("Save shares")}
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card padding="none" className={cn("flex items-center gap-4 px-5 py-4.5", paused && "border-warning-line bg-warning-50")}>
            <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-field", paused ? "bg-warning-soft text-warning" : "bg-surface-sunken text-ink-2")}>
              <Pause className="size-4.5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.75">
              <h2 className="text-title font-semibold text-ink">{t("Pause the group")}</h2>
              <span className="text-small leading-normal text-ink-muted">{paused ? t("The group is paused: new entries are off until you resume it. Everything stays visible.") : t("Stops new money entries for a while (for example during a long trip). Turn it off again any time.")}</span>
            </div>
            <SaveStatus state={status("pause")} />
            <SmallSwitch on={paused} label={t("Pause group")} disabled={isPending} onClick={() => save("pause", { paused: !paused })} />
          </Card>

          <Card padding="none" className="overflow-hidden">
            <h2 className="px-5 pt-5 pb-3 text-title font-semibold text-ink">{t("About this group")}</h2>
            <dl className="flex flex-col">
              {about.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3 border-t border-divider px-5 py-3 text-body">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <Link href={groupTabHref(data.businessId, "activity")} className="block border-t border-divider px-5 py-3 text-[13.5px] font-semibold text-emerald hover:underline">
              {t("See every change in the Activity log")}
            </Link>
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


          <Card padding="none" elevated={false} className="flex items-center gap-4 rounded-md border-expense-line px-5 py-4.5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.75">
              <h2 className="text-title font-semibold text-expense">{t("Danger zone")}</h2>
              <span className="text-small leading-normal text-ink-muted">{t("Deleting removes the group for everyone, with every entry and closed month.")}</span>
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
      </div>
    </div>
  );
}
