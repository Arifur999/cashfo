"use client";

import { Info, Minus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { deleteAssetAction, updateAssetAction, updateAssetValueAction, type UpdateAssetInput } from "@/lib/customer/assetActions";
import { categoryVisual, gainChip, lastValued, latestPurchaseDay, newValueFloor, valueTimeline } from "@/lib/customer/assetDisplay";
import type { ActionResult } from "@/lib/customer/authActions";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { getAppToday } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetTypeTile } from "./AssetTypeTile";
import { AssetValueHistory } from "./AssetValueHistory";
import { TypeChoice } from "./TypeChoice";

interface UpdateValueDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  asset: Asset | null;
  categories: AssetCategoryOption[];
  currency: string;
  // Opens on its details (Purchase & Sell's Edit purchase).
  initialMode?: Mode;
}

type Mode = "value" | "details";

const CHIP = { income: "bg-mint-50 text-emerald", expense: "bg-expense-soft text-expense", neutral: "bg-surface-sunken text-ink-2" } as const;

// An owned asset, for those who can change it. Value: what it is worth now,
// against the last value and what was paid, with the whole value history
// under it. Details: its name, type, note and (while the backend allows it)
// purchase date set right, or the asset deleted when it was entered by
// mistake.
export function UpdateValueDrawer({ open, onClose, businessId, asset, categories, currency, initialMode = "value" }: UpdateValueDrawerProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [mode, setMode] = useState<Mode>("value");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  // The details, as corrected.
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [bought, setBought] = useState("");
  // Which button waits while a request runs.
  const [running, setRunning] = useState<"save" | "delete">("save");
  // The value just saved, for the result screen.
  const [saved, setSaved] = useState<{ before: number; after: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open && asset ? asset.id : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open && asset) {
      setSaved(null);
      setMode(initialMode);
      setValue(String(Number(asset.currentValue)));
      setDate(getAppToday());
      setNote("");
      setName(asset.name);
      setCategory(asset.category);
      setNotes(asset.notes ?? "");
      setBought(asset.purchaseDate.slice(0, 10));
    }
  }

  if (!asset) return null;
  const today = getAppToday();
  const next = Number(value) || 0;
  const current = Number(asset.currentValue);
  const paid = Number(asset.purchasePrice);
  const changed = next > 0 && next !== current;
  const sinceLast = gainChip(current > 0 ? ((next - current) / current) * 100 : 0);
  const vsPaid = gainChip(paid > 0 ? ((next - paid) / paid) * 100 : 0);
  const visual = categoryVisual(categories, asset.category);
  const since = lastValued(asset);
  // Nothing is worth something before it was bought.
  const floor = newValueFloor(asset);
  // Older than the newest value: it fills in the history, and the backend
  // keeps the newest as the value today.
  const backdated = since !== null && date < since.slice(0, 10);
  const timeline = valueTimeline(asset, changed || (backdated && next > 0) ? { date, value: next, note: note.trim() || null } : undefined);
  // A typed date can still fall outside the picker's range.
  const valid = next > 0 && date >= floor && date <= today;

  // The purchase date moves only on an owned asset no wallet paid for (a
  // paid purchase keeps its posting's date), and never past a value
  // recorded since; the backend refuses it otherwise.
  const fromWallet = !!asset.purchaseAccountId;
  const redate = !fromWallet && asset.status === "ACTIVE";
  const boughtMax = latestPurchaseDay(asset, today);
  // Only what was changed is sent; an emptied note is cleared.
  const changes: UpdateAssetInput = {
    ...(name.trim() !== asset.name.trim() && { name: name.trim() }),
    ...(category !== asset.category && { category }),
    ...(notes.trim() !== (asset.notes ?? "").trim() && { notes: notes.trim() || null }),
    ...(redate && bought !== asset.purchaseDate.slice(0, 10) && { purchaseDate: bought }),
  };
  const detailsValid = name.trim().length > 0 && category.length > 0 && (!redate || bought <= boughtMax) && Object.keys(changes).length > 0;

  // One of the asset actions: a toast either way, and on success the drawer
  // closes and the page reads its assets again. A request that never
  // reached the server (offline, a new deploy) is a failure too.
  function run(work: "save" | "delete", action: () => Promise<ActionResult<unknown>>, done: string, failed: string) {
    setRunning(work);
    startTransition(async () => {
      const result = await action().catch((): ActionResult<unknown> => ({ success: false }));
      if (result.success) {
        toast.success(t(done));
        onClose();
        router.refresh();
      } else {
        toast.error(t(result.message ?? failed));
      }
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || !asset) return;
    if (mode === "details") {
      if (detailsValid) run("save", () => updateAssetAction(businessId, asset.id, changes), "Changes saved", "Failed to save the changes");
    } else if (valid) {
      // An earlier date fills in the history and leaves today's value, so
      // only a value for the latest day gets the result screen.
      if (backdated) {
        run("save", () => updateAssetValueAction(businessId, asset.id, { value: next, date, note: note.trim() || undefined }), "Value updated", "Failed to update value");
        return;
      }
      setRunning("save");
      startTransition(async () => {
        const result = await updateAssetValueAction(businessId, asset.id, { value: next, date, note: note.trim() || undefined }).catch((): ActionResult<unknown> => ({ success: false }));
        if (result.success) {
          setSaved({ before: current, after: next });
          router.refresh();
        } else {
          toast.error(t(result.message ?? "Failed to update value"));
        }
      });
    }
  }

  async function remove() {
    if (isPending || !asset) return;
    const confirmed = await confirm({
      title: t("Delete {name}?", { name: asset.name }),
      message: fromWallet ? t("The {amount} you paid goes back into the wallet it came from.", { amount: formatCurrency(paid, currency, fmt) }) : t("It was added as already owned, so no wallet changes."),
      confirmLabel: "Delete asset",
    });
    if (confirmed) run("delete", () => deleteAssetAction(businessId, asset.id), "Asset deleted", "Failed to delete the asset");
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  if (saved) {
    const move = saved.after - saved.before;
    const movePercent = saved.before > 0 ? (move / saved.before) * 100 : 0;
    const paidChip = gainChip(paid > 0 ? ((saved.after - paid) / paid) * 100 : 0);
    const paidMove = saved.after - paid;
    const Icon = move > 0 ? TrendingUp : move < 0 ? TrendingDown : Minus;
    return (
      <Drawer
        open={open}
        popup
        width={460}
        icon={<AssetTypeTile visual={visual} size="lg" className="rounded-field" />}
        title={t("Update value")}
        description={`${asset.name} · ${t(asset.category)}`}
        onClose={onClose}
        footer={
          <Button type="button" onClick={onClose} className="px-5">
            {t("Done@@sheet")}
          </Button>
        }
      >
        <div role="status" className="flex flex-col items-center gap-2 py-4 text-center">
          <span className={cn("flex size-14 items-center justify-center rounded-full", move > 0 ? "bg-income-soft text-income" : move < 0 ? "bg-expense-soft text-expense" : "bg-surface-sunken text-ink-2")}>
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <span className={cn("text-[20px] font-bold", move > 0 ? "text-income" : move < 0 ? "text-expense" : "text-ink")}>
            {move === 0 ? t("Value unchanged") : t(move > 0 ? "Value went up {percent}" : "Value went down {percent}", { percent: toLocaleDigits(`${Math.abs(movePercent).toFixed(1)}%`, fmt) })}
          </span>
          <span className="text-body text-ink-2 tabular-nums">
            {`${formatCurrency(saved.before, currency, fmt)} → ${formatCurrency(saved.after, currency, fmt)}`}
            {move !== 0 && ` (${move > 0 ? "+" : "−"} ${formatCurrency(Math.abs(move), currency, fmt)})`}
          </span>
          <span className="text-small text-ink-muted tabular-nums">
            {t("Compared with what you paid: {change}", { change: `${paidMove > 0 ? "+" : paidMove < 0 ? "−" : ""} ${formatCurrency(Math.abs(paidMove), currency, fmt)} · ${toLocaleDigits(paidChip.label, fmt)}`.trim() })}
          </span>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      open={open}
      popup
      width={460}
      icon={<AssetTypeTile visual={visual} size="lg" className="rounded-field" />}
      title={mode === "value" ? t("Update value") : t("Edit details")}
      description={`${asset.name} · ${t(asset.category)}`}
      busy={isPending}
      onClose={onClose}
      onSubmit={submit}
      footer={
        // On a phone Delete takes a row of its own under the buttons, so
        // Save never runs off the edge, whatever the language.
        <div className="flex w-full flex-wrap items-center gap-2.5">
          {mode === "details" && (
            <Button type="button" variant="ghost" onClick={remove} disabled={isPending} className="text-expense hover:bg-expense-soft hover:text-expense max-sm:order-last max-sm:w-full">
              {isPending && running === "delete" ? <Loader size={16} label={t("Deleting...")} /> : <Trash2 />}
              {t("Delete asset")}
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2.5">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={(mode === "value" ? !valid : !detailsValid) || isPending} className="px-4.5">
              {isPending && running === "save" && <Loader size={16} onDark label={t("Loading...")} />}
              {mode === "value" ? t("Save new value") : t("Save changes")}
            </Button>
          </div>
        </div>
      }
    >
      <div className="-my-1 flex flex-col gap-4">
        <SegmentedControl
          options={[
            { value: "value", label: "Value" },
            { value: "details", label: "Details" },
          ]}
          value={mode}
          onChange={setMode}
          label="What to change"
          size="lg"
          stretch
        />

        {/* Both parts stay mounted, so the new value keeps its focus
            and nothing typed is lost on a switch. */}
        <div hidden={mode !== "value"} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 rounded-[14px] border border-line bg-strip p-4 tabular-nums">
            <span className="flex flex-col gap-0.5 *:leading-[normal]">
              <span className="text-caption font-normal text-ink-muted">{t("Current value")}</span>
              <span className="text-title text-ink">{formatCurrency(current, currency, fmt)}</span>
              <span className="text-caption font-normal text-ink-muted">{since ? t("since {date}", { date: formatDate(since, "d MMM yyyy", fmt) }) : t("Not checked since bought")}</span>
            </span>
            <span className="flex flex-col gap-0.5 *:leading-[normal]">
              <span className="text-caption font-normal text-ink-muted">{t("You paid")}</span>
              <span className="text-title text-ink">{formatCurrency(paid, currency, fmt)}</span>
              <span className="text-caption font-normal text-ink-muted">{t("Bought on {date}", { date: formatDate(asset.purchaseDate, "d MMM yyyy", fmt) })}</span>
            </span>
          </div>

          <Field htmlFor="upd-value" label={label(t("New value"))}>
            <AmountInput id="upd-value" value={value} onChange={setValue} currency={currency} autoFocus />
            {next > 0 && (
              <div className="flex flex-wrap gap-2">
                {/* A value for an earlier day leaves today's alone; the line below says so. */}
                {!backdated && (
                  <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-caption font-semibold tabular-nums", CHIP[sinceLast.tone])}>
                    {sinceLast.tone === "income" ? <TrendingUp className="size-3.5" aria-hidden="true" /> : sinceLast.tone === "expense" ? <TrendingDown className="size-3.5" aria-hidden="true" /> : null}
                    {changed ? t("{change} since the last value", { change: `${next > current ? "+" : "−"} ${formatCurrency(Math.abs(next - current), currency, fmt)} (${toLocaleDigits(sinceLast.label, fmt)})` }) : t("Same as the last value")}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-surface-sunken px-3 py-1 text-caption font-semibold text-ink-2 tabular-nums">{t("{change} vs what you paid", { change: toLocaleDigits(vsPaid.label, fmt) })}</span>
              </div>
            )}
            {backdated && (
              <p className="flex items-start gap-2 text-caption text-ink-muted">
                <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                {t("An earlier date fills in the history; the value today stays {amount}.", { amount: formatCurrency(current, currency, fmt) })}
              </p>
            )}
          </Field>

          <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
            <Field htmlFor="upd-date" label={label(t("Date"))}>
              <DayInput id="upd-date" size="md" value={date} onChange={setDate} min={floor} max={today} />
            </Field>
            <Field htmlFor="upd-note" label={label(t("Note"), true)}>
              <Input id="upd-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("Mouza rate went up")} className="px-0" frameClassName="px-3" />
            </Field>
          </div>

          <AssetValueHistory entries={timeline} currency={currency} today={today} />
        </div>

        <div hidden={mode !== "details"} className="flex flex-col gap-4">
          <Field htmlFor="upd-name" label={label(t("Asset name"))}>
            <Input id="upd-name" size="md" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder={t("Gold ring, 22K")} />
          </Field>

          <TypeChoice categories={categories} value={category} onChange={setCategory} onClose={onClose} keep={asset.category} />

          <Field
            htmlFor="upd-bought"
            label={label(t("Bought on"))}
            hint={
              redate
                ? boughtMax < today
                  ? t("It can't be later than the first value recorded after it, on {date}.", { date: formatDate(boughtMax, "d MMM yyyy", fmt) })
                  : undefined
                : t(fromWallet ? "A purchase paid from a wallet keeps its date. Delete the asset and add it again to change it." : "A sold asset keeps its purchase date. Undo the sale to change it.")
            }
          >
            {redate ? (
              <DayInput id="upd-bought" size="md" value={bought} onChange={setBought} max={boughtMax} aria-describedby={boughtMax < today ? "upd-bought-hint" : undefined} />
            ) : (
              <Input id="upd-bought" size="md" value={formatDate(asset.purchaseDate, "d MMM yyyy", fmt)} readOnly aria-describedby="upd-bought-hint" className="text-ink-2" frameClassName="border-line bg-strip px-3" />
            )}
          </Field>

          <Field htmlFor="upd-notes" label={label(t("Note"), true)}>
            <Input id="upd-notes" size="md" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={200} placeholder={t("e.g. 4 ana, from Baitul Mukarram")} className="px-0" frameClassName="px-3" />
          </Field>
        </div>
      </div>
      {confirmDialog}
    </Drawer>
  );
}
