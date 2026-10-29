"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import type { AssetCategoryOption } from "@/lib/customer/api";
import { categoryVisual, isActiveCategory } from "@/lib/customer/assetDisplay";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetTypeTile } from "./AssetTypeTile";

interface TypeChoiceProps {
  categories: AssetCategoryOption[];
  value: string;
  onChange: (name: string) => void;
  // The drawer closes when the reader follows the link to Asset types.
  onClose: () => void;
  // The type an asset already carries, when it is no longer one of the
  // types (deleted since): it stays as a chip of its own, so the asset can
  // keep it.
  keep?: string;
}

// One of the asset types, as a row of radio chips: one Tab stop, the arrow
// keys move the choice (and Home / End jump to the ends), as a radio group
// does.
export function TypeChoice({ categories, value, onChange, onClose, keep }: TypeChoiceProps) {
  const { t } = useLocale();
  const legendId = useId();
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  // Inactive categories are left out, unless already picked or carried.
  const names = categories.filter((option) => isActiveCategory(option) || option.name === value || option.name === keep).map((option) => option.name);
  if (keep && !names.includes(keep)) names.push(keep);
  const checked = names.indexOf(value);

  function move(event: React.KeyboardEvent, index: number) {
    const last = names.length - 1;
    const keys: Record<string, number> = { ArrowRight: index === last ? 0 : index + 1, ArrowDown: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, ArrowUp: index === 0 ? last : index - 1, Home: 0, End: last };
    if (!Object.hasOwn(keys, event.key)) return;
    event.preventDefault();
    const next = keys[event.key];
    onChange(names[next]);
    chips.current[next]?.focus();
  }

  return (
    <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
      <legend id={legendId} className="mb-2 text-body leading-[normal] font-medium text-ink">
        {t("Type")}
      </legend>
      {names.length === 0 ? (
        <p className="text-caption text-ink-muted">
          {fillNodes(t("No asset type yet. Add one under {assetTypes}."), {
            assetTypes: (
              <Link href="/assets-management/category" onNavigate={onClose} className="font-semibold text-emerald hover:underline">
                {t("Asset types")}
              </Link>
            ),
          })}
        </p>
      ) : (
        <div role="radiogroup" aria-labelledby={legendId} className="flex flex-wrap gap-2">
          {names.map((name, index) => {
            const on = index === checked;
            return (
              <button
                key={name}
                ref={(node) => {
                  chips.current[index] = node;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                // Only the chosen chip (or the first, before any) takes Tab.
                tabIndex={on || (checked === -1 && index === 0) ? 0 : -1}
                onClick={() => onChange(name)}
                onKeyDown={(event) => move(event, index)}
                className={cn(
                  "flex h-8.5 items-center gap-2 rounded-full border py-0 pr-3 pl-2 text-small transition-colors pointer-coarse:h-11",
                  on ? "border-[1.5px] border-emerald bg-mint-50 font-semibold text-emerald" : "border-line bg-surface font-medium text-ink-2 hover:border-line-strong",
                )}
              >
                {/* A kept type that is gone draws the neutral tile. */}
                <AssetTypeTile visual={categoryVisual(categories, name)} size="chip" />
                {t(name)}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
