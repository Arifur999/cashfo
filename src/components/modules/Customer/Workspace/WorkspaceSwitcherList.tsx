"use client";

import { Check, Lock, Store, User } from "lucide-react";
import { NIGHT_FOCUS } from "@/components/modules/Customer/Layout/SidebarNav";
import Loader from "@/components/shared/Loader";
import IconTile from "@/components/smartly/IconTile";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { UserBusiness } from "@/lib/customer/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { WorkspaceSwitch } from "./useWorkspaceSwitch";

interface WorkspaceSwitcherListProps {
  switcher: WorkspaceSwitch;
  // "menu": rows of the account menu, inside its DropdownMenu; "drawer":
  // the phone drawer's Night panel.
  variant: "menu" | "drawer";
}

interface RowState {
  business: UserBusiness;
  name: string;
  active: boolean;
  pending: boolean;
  locked: boolean;
}

// Every workspace the account can open, the open one ticked: personal
// first under the account holder's name, then the businesses A to Z. A
// lock marks one whose PIN this device hasn't entered; choosing it asks
// for the PIN (useWorkspaceSwitch renders that dialog).
export function WorkspaceSwitcherList({ switcher, variant }: WorkspaceSwitcherListProps) {
  const { t } = useLocale();

  return switcher.workspaces.map((business) => {
    const row: RowState = {
      business,
      name: switcher.nameOf(business),
      active: business.id === switcher.activeBusinessId,
      pending: business.id === switcher.pendingId,
      locked: switcher.isLocked(business),
    };
    const isBusiness = business.type === "BUSINESS";
    const caption = t(isBusiness ? "Business workspace" : "Personal workspace");

    if (variant === "menu") {
      return (
        <DropdownMenuItem
          key={business.id}
          role="menuitemradio"
          aria-checked={row.active}
          aria-busy={row.pending || undefined}
          disabled={switcher.busy && !row.pending}
          // An open workspace keeps the menu up to show it opening; a
          // locked one lets the menu close for the PIN dialog.
          onSelect={(event) => {
            if (!row.locked && !row.active) event.preventDefault();
            switcher.choose(business);
          }}
          className={cn("flex min-h-13 cursor-pointer items-center gap-3 rounded-none px-4 py-2 text-ink focus:bg-surface-sunken", row.active && "bg-mint-50")}
        >
          <IconTile tone={isBusiness ? "loans" : row.active ? "white" : "money"} size={32}>
            {isBusiness ? <Store /> : <User />}
          </IconTile>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-body font-semibold">{row.name}</span>
            <span className="text-caption font-normal text-ink-muted">{caption}</span>
          </span>
          <RowEnd row={row} onDark={false} />
        </DropdownMenuItem>
      );
    }

    return (
      <button
        key={business.id}
        type="button"
        aria-current={row.active ? "true" : undefined}
        aria-busy={row.pending || undefined}
        disabled={switcher.busy && !row.pending}
        onClick={() => switcher.choose(business)}
        className={cn(
          "flex min-h-12 w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors disabled:opacity-60",
          NIGHT_FOCUS,
          row.active ? "bg-mint-200/14 text-white" : "text-white/80 hover:bg-white/6 hover:text-white",
        )}
      >
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/8 text-mint-200 [&_svg]:size-4">
          {isBusiness ? <Store /> : <User />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-semibold">{row.name}</span>
          <span className="text-caption font-normal text-mint-200/70">{caption}</span>
        </span>
        <RowEnd row={row} onDark />
      </button>
    );
  });
}

// The lock, the tick, or the spinner while it opens.
function RowEnd({ row, onDark }: { row: RowState; onDark: boolean }) {
  const { t } = useLocale();
  return (
    <span className="flex shrink-0 items-center gap-2">
      {row.locked && (
        <span title={t("PIN lock")} className="flex items-center">
          <Lock className={cn("size-4", onDark ? "text-white/60" : "text-ink-muted")} aria-hidden="true" />
          <span className="sr-only">{t("PIN lock")}</span>
        </span>
      )}
      {row.pending ? (
        <Loader size={16} onDark={onDark} label={t("Loading...")} />
      ) : (
        row.active && <Check className={cn("size-4.5", onDark ? "text-night-money" : "text-brand-ink")} strokeWidth={2.5} aria-hidden="true" />
      )}
    </span>
  );
}
