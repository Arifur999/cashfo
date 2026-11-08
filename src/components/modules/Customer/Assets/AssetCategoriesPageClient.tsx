"use client";

import { ArrowRight, Check, Info, Package, Pencil, Plus, Search, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { nextChoiceIndex } from "@/components/smartly/choiceKeys";
import Input from "@/components/smartly/form/Input";
import IconAction from "@/components/smartly/IconAction";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { Switch } from "@/components/ui/switch";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { createAssetCategoryAction, deleteAssetCategoryAction, updateAssetCategoryAction } from "@/lib/customer/assetActions";
import { categoryVisual, isActiveCategory } from "@/lib/customer/assetDisplay";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryColorVar, categoryTone } from "@/lib/customer/categoryTone";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetTypeTile } from "./AssetTypeTile";
import { ReadOnlyNote } from "./ReadOnlyNote";

interface AssetCategoriesPageClientProps {
  businessId: string;
  categories: AssetCategoryOption[];
  // Every asset, for each category's count and what was sold.
  assets: Asset[];
  currency: string;
  canManage: boolean;
}

// The board's table: #, Category, Assets, In forms, Actions.
const COLUMNS = "md:grid-cols-[40px_minmax(0,1fr)_200px_260px_84px]";

// The popup's seven icons and ten colours, in the board's order (the keys
// are the shared category icon and colour names the backend accepts).
const ICONS = [
  { key: "mountain", label: "Land" },
  { key: "car", label: "Vehicle" },
  { key: "building-2", label: "House or flat" },
  { key: "gem", label: "Jewellery" },
  { key: "laptop", label: "Electronics" },
  { key: "trending-up", label: "Investment" },
  { key: "package", label: "Other" },
] as const;
const COLOURS = [
  { key: "green", label: "Green" },
  { key: "blue", label: "Blue" },
  { key: "orange", label: "Orange" },
  { key: "pink", label: "Pink" },
  { key: "purple", label: "Purple" },
  { key: "teal", label: "Teal" },
  { key: "yellow", label: "Gold@@colour" },
  { key: "indigo", label: "Indigo" },
  { key: "red", label: "Red" },
  { key: "lime", label: "Leaf green" },
] as const;
const NAME_MAX = 30;

type Editing = { id: string | null; name: string; original: string; icon: string; color: string };

// Arrow keys, Home and End move a radio group's choice and its focus.
function radioKeys(event: React.KeyboardEvent<HTMLElement>, keys: readonly string[], current: string, pick: (key: string) => void) {
  const next = nextChoiceIndex(keys.indexOf(current), keys.length, event.key);
  if (next === null) return;
  event.preventDefault();
  pick(keys[next]);
  event.currentTarget.querySelectorAll<HTMLElement>("[role=radio]")[next]?.focus();
}

// Asset categories: each one with how many assets it holds, a switch that
// hides it from the purchase and Add asset forms, and Edit / Delete. Add and
// Edit pick a name, an icon and a colour; a category that still files
// assets can't be deleted, and the popup says how to move them.
export function AssetCategoriesPageClient({ businessId, categories, assets, canManage }: AssetCategoriesPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [nameError, setNameError] = useState("");
  const [deleting, setDeleting] = useState<AssetCategoryOption | null>(null);
  const [blocked, setBlocked] = useState<AssetCategoryOption | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [, startRow] = useTransition();
  // The backend keeps the last category: an asset needs one to be filed under.
  const last = categories.length <= 1;
  const onCount = categories.filter(isActiveCategory).length;

  const countsOf = (category: AssetCategoryOption) => {
    const inIt = assets.filter((asset) => asset.category === category.name);
    const sold = inIt.filter((asset) => asset.status === "SOLD").length;
    return { all: inIt.length, sold, owned: inIt.length - sold };
  };
  const assetsLabel = (count: number) => t(count === 1 ? "{count} asset" : "{count} assets", { count: formatCount(count, fmt) });
  const q = search.trim().toLowerCase();
  const shown = categories.filter((category) => !q || [category.name, t(category.name)].some((text) => text.toLowerCase().includes(q)));

  function openAdd() {
    const color = COLOURS[categories.length % COLOURS.length].key;
    setEditing({ id: null, name: "", original: "", icon: "package", color });
    setNameError("");
  }

  function openEdit(category: AssetCategoryOption) {
    setEditing({ id: category.id, name: t(category.name), original: t(category.name), icon: category.icon || "package", color: category.color });
    setNameError("");
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const trimmed = editing.name.trim();
    const renamed = trimmed !== editing.original.trim();
    if (!trimmed) return setNameError(t("Enter a category name."));
    if (renamed && trimmed.length > NAME_MAX) return setNameError(t("Keep it under 30 characters."));
    if (renamed && categories.some((category) => category.id !== editing.id && [category.name, t(category.name)].some((name) => name.toLowerCase() === trimmed.toLowerCase()))) return setNameError(t("You already have this category."));
    const current = editing.id ? categories.find((category) => category.id === editing.id) : null;
    startSave(async () => {
      const result = current
        ? // A name left as it reads (the Bangla of a default too) stays as it is stored.
          await updateAssetCategoryAction(businessId, current.id, { ...(renamed && { name: trimmed }), icon: editing.icon, color: editing.color })
        : await createAssetCategoryAction(businessId, { name: trimmed, icon: editing.icon, color: editing.color });
      if (!result.success) {
        toast.error(t(result.message ?? "Failed to save the asset type"));
        return;
      }
      toast.success(t(current ? "Category saved" : "Category added"));
      setEditing(null);
      if (!current) setSearch("");
      router.refresh();
    });
  }

  function run(category: AssetCategoryOption, action: () => Promise<{ success: boolean; message?: string }>, failed: string, done: (() => void) | null) {
    setBusyId(category.id);
    startRow(async () => {
      try {
        const result = await action();
        if (result.success) {
          done?.();
          router.refresh();
        } else {
          toast.error(t(result.message ?? failed));
        }
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      } finally {
        setBusyId(null);
      }
    });
  }

  function toggle(category: AssetCategoryOption, on: boolean, undo = true) {
    if (!on && onCount <= 1) {
      toast.warning(t("Keep at least one category on for the forms."));
      return;
    }
    run(category, () => updateAssetCategoryAction(businessId, category.id, { isActive: on }), "Failed to save the asset type", () =>
      toast.success(t(on ? "Category shows in the forms again" : "Category hidden from the forms"), undo ? { action: { label: t("Undo"), onClick: () => toggle(category, !on, false) } } : undefined),
    );
  }

  function askDelete(category: AssetCategoryOption) {
    if (busyId || last) return;
    if (countsOf(category).all > 0) setBlocked(category);
    else setDeleting(category);
  }

  function confirmDelete() {
    const category = deleting;
    if (!category) return;
    setDeleting(null);
    run(category, () => deleteAssetCategoryAction(businessId, category.id), "Failed to delete the asset type", () => toast.success(t("Category deleted")));
  }

  const preview = editing && { icon: budgetCategoryIcon(editing.icon), tone: categoryTone(editing.color), color: categoryColorVar(editing.color) };
  const blockedCount = blocked ? countsOf(blocked).all : 0;

  return (
    <PageFrame className="leading-[normal]">
      <PageHeader
        title={t("Asset categories")}
        description={t("Group your assets. Each category has its own icon and colour across the Assets pages.")}
        actions={
          <>
            <Input
              size="sm"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              leading={<Search />}
              placeholder={t("Search categories…")}
              aria-label={t("Search categories")}
              frameClassName="h-11 w-70 rounded-full max-md:w-full"
            />
            {canManage && (
              <Button onClick={openAdd} className="h-11 rounded-full px-4.5">
                <Plus strokeWidth={2.5} className="size-4" />
                {t("Add category")}
              </Button>
            )}
          </>
        }
      />
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add or change asset types in this workspace.")}</ReadOnlyNote>}

      <Card padding="none" className="overflow-hidden rounded-[18px]" role="region" aria-label={t("Category list")}>
        <div className={cn("hidden items-center gap-x-4 border-b border-line bg-table-head px-6 py-3 text-caption font-semibold text-ink-muted md:grid", COLUMNS)}>
          <span>#</span>
          <span>{t("Category")}</span>
          <span>{t("Assets")}</span>
          <span>{t("In forms")}</span>
          <span className="text-right">{t("Actions")}</span>
        </div>
        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-[14px] bg-surface-sunken text-ink-muted">
              <Package className="size-5.5" />
            </span>
            <span className="text-[15px] font-semibold wrap-anywhere text-ink">{categories.length === 0 ? t("No categories yet") : t("No categories match “{q}”", { q: search.trim() })}</span>
            <span className="text-[13.5px] text-ink-muted">{categories.length === 0 ? t("Add one to start grouping your assets.") : t("Check the spelling or clear the search.")}</span>
            {categories.length > 0 ? (
              <Button variant="secondary" onClick={() => setSearch("")} className="mt-1.5 h-10 rounded-full px-4 text-[13.5px]">
                {t("Clear search")}
              </Button>
            ) : (
              canManage && (
                <Button variant="secondary" onClick={openAdd} className="mt-1.5 h-10 rounded-full px-4 text-[13.5px]">
                  {t("Add category")}
                </Button>
              )
            )}
          </div>
        ) : (
          <ul>
            {shown.map((category) => {
              const label = t(category.name);
              const on = isActiveCategory(category);
              const counts = countsOf(category);
              const busy = busyId === category.id;
              const count = counts.all === 0 ? t("No assets yet") : [assetsLabel(counts.owned), counts.sold > 0 ? t("{count} sold", { count: formatCount(counts.sold, fmt) }) : null].filter(Boolean).join(" · ");
              const statusId = `asset-cat-status-${category.id}`;
              return (
                <li
                  key={category.id}
                  aria-busy={busy || undefined}
                  className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-divider px-6 py-3 md:h-17 md:py-0", COLUMNS, !on && "bg-strip")}
                >
                  <span className="text-[14px] text-ink-muted tabular-nums max-md:hidden">{formatCount(categories.indexOf(category) + 1, fmt)}</span>
                  <span className={cn("flex min-w-0 items-center gap-3", !on && "opacity-60")}>
                    <AssetTypeTile visual={categoryVisual(categories, category.name)} size="lg" glossy className="rounded-[12px] [&_svg]:size-5" />
                    <span className="flex min-w-0 flex-col">
                      <span title={label} className="truncate text-[15px] font-semibold text-ink">
                        {label}
                      </span>
                      <span className="text-caption text-ink-muted md:hidden">{count}</span>
                    </span>
                  </span>
                  <span className="min-w-0 max-md:hidden">
                    {counts.all > 0 ? (
                      <Link href={`/assets-management/current?category=${encodeURIComponent(category.name)}`} title={t("See {name} assets", { name: label })} className="text-[13px] whitespace-nowrap text-ink-soft hover:text-emerald hover:underline">
                        {count}
                      </Link>
                    ) : (
                      <span className="text-[13px] whitespace-nowrap text-ink-muted">{count}</span>
                    )}
                  </span>
                  <span className="flex min-w-0 items-center gap-3 max-md:col-start-1 max-md:row-start-2">
                    <Switch
                      checked={on}
                      disabled={!canManage || busy}
                      onCheckedChange={(next) => toggle(category, next)}
                      aria-label={t(on ? "Hide {name} from the forms" : "Show {name} in the forms", { name: label })}
                      aria-describedby={statusId}
                    />
                    <span id={statusId} className="flex min-w-0 flex-col gap-px">
                      <span className={cn("text-[13px] font-semibold", on ? "text-income" : "text-ink-muted")}>{t(on ? "On" : "Off")}</span>
                      <span className="truncate text-[11.5px] text-ink-muted">{t(on ? "Shows in purchase and add forms" : "Hidden from forms, assets stay")}</span>
                    </span>
                  </span>
                  <span className="flex justify-end gap-1.5 max-md:col-start-2 max-md:row-span-2 max-md:row-start-1">
                    {canManage && (
                      <>
                        <IconAction onClick={() => openEdit(category)} disabled={busy} aria-label={t("Edit {name}", { name: label })} title={t("Edit")}>
                          <Pencil aria-hidden="true" />
                        </IconAction>
                        {/* The last category says why it stays (its title is read as the description). */}
                        <IconAction tone="danger" onClick={() => askDelete(category)} disabled={busy || last} aria-label={t("Delete {name}", { name: label })} title={last ? t("Keep at least one category.") : t("Delete")}>
                          {busy ? <Loader size={14} label={t("Loading...")} /> : <Trash2 aria-hidden="true" />}
                        </IconAction>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="flex items-start gap-2 px-6 py-3 text-[13px] leading-[1.45] text-ink-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {t("Switched on categories show in the Category list of the purchase form and Add asset. Switching one off only hides it there; assets already in it stay as they are.")}
        </p>
      </Card>

      <PopupDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        width={500}
        title={t(editing?.id ? "Edit category" : "Add category")}
        busy={isSaving}
        onSubmit={save}
        bodyClassName="gap-4.5 px-6 py-5"
        footerClassName="bg-surface"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={isSaving} className="h-11 rounded-full px-4.5">
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isSaving} className="h-11 rounded-full px-5">
              {isSaving && <Loader size={16} onDark label={t("Saving...")} />}
              {t(editing?.id ? "Save changes" : "Add category")}
            </Button>
          </>
        }
      >
        {editing && preview && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="asset-cat-name" className="text-[14px] font-medium text-ink">
                {t("Category name")}
              </label>
              <div className="flex items-center gap-2.5">
                <AssetTypeTile visual={preview} size="xl" glossy className="rounded-[14px] [&_svg]:size-6" />
                <Input
                  id="asset-cat-name"
                  size="md"
                  value={editing.name}
                  invalid={!!nameError}
                  onChange={(event) => {
                    setEditing({ ...editing, name: event.target.value });
                    setNameError("");
                  }}
                  maxLength={60}
                  autoComplete="off"
                  autoFocus
                  placeholder={t("e.g. Shares, Business, Livestock")}
                  frameClassName="h-12 flex-1"
                />
              </div>
              {nameError ? (
                <span id="asset-cat-name-error" role="alert" className="text-[12.5px] text-expense">
                  {nameError}
                </span>
              ) : (
                <span className="text-[12.5px] text-ink-muted">{t("It will show in the Category list of the purchase form and Add asset.")}</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <span id="asset-cat-icon" className="text-[14px] font-medium text-ink">
                {t("Icon")}
              </span>
              <div
                role="radiogroup"
                aria-labelledby="asset-cat-icon"
                onKeyDown={(event) => radioKeys(event, ICONS.map((icon) => icon.key), editing.icon, (icon) => setEditing({ ...editing, icon }))}
                className="grid grid-cols-7 gap-2"
              >
                {ICONS.map((icon) => {
                  const picked = icon.key === editing.icon;
                  const Icon = budgetCategoryIcon(icon.key);
                  return (
                    <button
                      key={icon.key}
                      type="button"
                      role="radio"
                      aria-checked={picked}
                      tabIndex={picked || (!ICONS.some((item) => item.key === editing.icon) && icon.key === "package") ? 0 : -1}
                      aria-label={t(icon.label)}
                      title={t(icon.label)}
                      onClick={() => setEditing({ ...editing, icon: icon.key })}
                      className={cn("flex h-12 items-center justify-center rounded-[12px] border bg-surface text-ink-muted outline-none focus-visible:ring-2 focus-visible:ring-emerald", picked ? cn("border-2 border-current", preview.tone.fg, preview.tone.bg) : "border-line hover:bg-surface-sunken")}
                    >
                      <Icon className="size-5.5" strokeWidth={1.6} fill={picked ? "currentColor" : "none"} fillOpacity={picked ? 0.18 : 0} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span id="asset-cat-colour" className="text-[14px] font-medium text-ink">
                {t("Colour")}
              </span>
              <div
                role="radiogroup"
                aria-labelledby="asset-cat-colour"
                onKeyDown={(event) => radioKeys(event, COLOURS.map((colour) => colour.key), editing.color, (color) => setEditing({ ...editing, color }))}
                className="flex flex-wrap gap-2.5"
              >
                {COLOURS.map((colour) => {
                  const picked = colour.key === editing.color;
                  return (
                    <button
                      key={colour.key}
                      type="button"
                      role="radio"
                      aria-checked={picked}
                      tabIndex={picked || (!COLOURS.some((item) => item.key === editing.color) && colour.key === "green") ? 0 : -1}
                      aria-label={t(colour.label)}
                      title={t(colour.label)}
                      onClick={() => setEditing({ ...editing, color: colour.key })}
                      style={{ background: categoryColorVar(colour.key), boxShadow: picked ? `0 0 0 2px var(--surface), 0 0 0 4px ${categoryColorVar(colour.key)}` : undefined }}
                      className="flex size-8 items-center justify-center rounded-full text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
                    >
                      {picked && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </PopupDialog>

      <PopupDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        width={440}
        plain
        title={
          deleting && (
            <span className="flex min-w-0 items-center gap-3 text-[18px] font-semibold">
              <AssetTypeTile visual={categoryVisual(categories, deleting.name)} size="lg" glossy className="rounded-[12px] [&_svg]:size-5" />
              <span className="min-w-0 wrap-anywhere">{t("Delete {name}?", { name: t(deleting.name) })}</span>
            </span>
          )
        }
        sub={t("No assets use this category, so nothing else changes. It is removed from the Category list of the forms.")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} className="h-11 rounded-full px-4.5">
              {t("Cancel")}
            </Button>
            <Button variant="danger" onClick={confirmDelete} className="h-11 rounded-full px-5">
              {t("Delete")}
            </Button>
          </>
        }
      />

      <PopupDialog
        open={blocked !== null}
        onClose={() => setBlocked(null)}
        width={460}
        plain
        title={
          blocked && (
            <span className="flex min-w-0 items-center gap-3 text-[18px] font-semibold">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-warning-50 text-warning">
                <TriangleAlert className="size-5" />
              </span>
              <span className="min-w-0 wrap-anywhere">{t("Can’t delete {name} yet", { name: t(blocked.name) })}</span>
            </span>
          )
        }
        sub={
          blocked &&
          t("{name} has {count}. Sold assets count too, because their history keeps the category. Move them to another category first (edit the purchase in Purchase & Sell).", { name: t(blocked.name), count: assetsLabel(blockedCount) })
        }
        footer={
          blocked && (
            <>
              <Button variant="secondary" onClick={() => setBlocked(null)} className="h-11 rounded-full px-4.5">
                {t("Close")}
              </Button>
              <Button asChild className="h-11 rounded-full px-5">
                <Link href={`/assets-management/current?category=${encodeURIComponent(blocked.name)}`} onClick={() => setBlocked(null)}>
                  {t("See these assets")}
                  <ArrowRight className="size-3.75" aria-hidden="true" />
                </Link>
              </Button>
            </>
          )
        }
      >
        <p className="rounded-[10px] bg-surface-sunken px-3 py-2.5 text-[13px] leading-[1.45] text-ink-soft">{t("Only want it out of the forms? Switch it off instead. The assets stay as they are.")}</p>
      </PopupDialog>
    </PageFrame>
  );
}
