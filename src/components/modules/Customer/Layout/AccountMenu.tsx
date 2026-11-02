"use client";

import { CircleHelp, Gift, LayoutGrid, Lock, LogOut, Settings, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useWorkspaceSwitch } from "@/components/modules/Customer/Workspace/useWorkspaceSwitch";
import { WorkspaceSwitcherList } from "@/components/modules/Customer/Workspace/WorkspaceSwitcherList";
import Avatar from "@/components/smartly/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { lockWorkspaceAction } from "@/lib/customer/businessActions";
import { formatCurrency } from "@/lib/customer/currency";
import { getReferralInfoAction } from "@/lib/customer/referralActions";
import { CHOOSE_WORKSPACE_ROUTE } from "@/lib/customer/workspaceSwitch";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { workspaceKind } from "./workspaceKind";

const ITEM = "flex min-h-11 cursor-pointer items-center gap-3 rounded-none px-4 py-2 text-body font-medium text-ink focus:bg-surface-sunken [&_svg]:size-4.5 [&_svg]:text-ink-2";

// The top bar's account button and its menu: who is signed in, every
// workspace they can open (the open one ticked), the chooser and the
// workspace settings, then settings, referrals (with what is ready to
// withdraw) and help, lock and sign out.
export function AccountMenu({ className }: { className?: string }) {
  const { user, activeBusiness, logout } = useAuth();
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  // The menu closes for the PIN dialog, so its row is gone when the dialog
  // closes: the focus goes back to this button instead.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const switcher = useWorkspaceSwitch({ onSwitched: () => setOpen(false), returnFocusRef: triggerRef });
  const kind = workspaceKind(activeBusiness);
  // Read each time the menu opens, not on every page: after a withdrawal
  // the reward ready to take has changed. The last figure shows meanwhile.
  const [earnings, setEarnings] = useState<string | null>(null);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) return;
    void getReferralInfoAction().then((result) => {
      if (result.success && result.data) setEarnings(result.data.balances.available);
    });
  }

  function lock() {
    if (!activeBusiness) return;
    startTransition(async () => {
      await lockWorkspaceAction(activeBusiness.id);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={changeOpen}>
        <DropdownMenuTrigger
          ref={triggerRef}
          aria-label={`${t("Account menu")} — ${user.name}, ${t(kind)}`}
          // The avatar alone (AppTopbar board): 36px on a phone, 38px with a
          // white ring from md up.
          className={cn("flex shrink-0 items-center justify-center rounded-full", className)}
        >
          <Avatar name={user.name} src={user.avatarUrl} size={36} tone="soft" alt="" className="md:size-9.5 md:border-2 md:border-surface md:shadow-button" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          // The PIN dialog takes the focus, and gives it to the trigger once
          // it closes; the menu mustn't take it back first.
          onCloseAutoFocus={(event) => {
            if (switcher.prompting) event.preventDefault();
          }}
          className="w-85 rounded-lg border border-line bg-surface p-0 shadow-overlay ring-0"
        >
          <div className="flex items-center gap-3 p-4">
            <Avatar name={user.name} src={user.avatarUrl} size={44} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body font-bold text-ink">{user.name}</span>
              <span className="truncate text-small text-ink-muted">{user.email}</span>
            </span>
          </div>

          <DropdownMenuGroup className="border-t border-line py-2">
            <DropdownMenuLabel className="px-4 pt-1 pb-2 text-overline text-ink-muted uppercase">{t("Workspace")}</DropdownMenuLabel>
            <WorkspaceSwitcherList switcher={switcher} variant="menu" />
            {/* The chooser has nothing to offer a single workspace. */}
            {switcher.workspaces.length > 1 && (
              <DropdownMenuItem asChild className={cn(ITEM, "mt-1")}>
                <Link href={CHOOSE_WORKSPACE_ROUTE}>
                  <LayoutGrid />
                  {t("See all workspaces")}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild className={cn(ITEM, switcher.workspaces.length <= 1 && "mt-1")}>
              <Link href="/settings/workspaces">
                <SlidersHorizontal />
                {t("Manage workspaces")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuGroup className="border-t border-line py-2">
            <DropdownMenuItem asChild className={ITEM}>
              <Link href="/settings">
                <Settings />
                {t("Settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={ITEM}>
              <Link href="/referrals">
                <Gift />
                <span className="flex-1">{t("Invite & earn")}</span>
                {/* brand-ink: the focused row turns sunken, where emerald text is too faint.
                    In the open workspace's currency, as Invite & earn shows it: a
                    withdrawal lands in its wallet. */}
                {earnings !== null && Number(earnings) > 0 && <span className="text-small font-bold text-brand-ink tabular-nums">{formatCurrency(earnings, activeBusiness?.currency ?? "BDT", fmt)}</span>}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={ITEM}>
              <Link href="/settings/help">
                <CircleHelp />
                {t("Help & support")}
              </Link>
            </DropdownMenuItem>
            {activeBusiness?.hasPinLock && (
              <DropdownMenuItem onSelect={lock} disabled={isPending} className={ITEM}>
                <Lock />
                {t("Lock workspace")}
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="m-0 bg-line" />
          <div className="py-2">
            <DropdownMenuItem onSelect={logout} className={cn(ITEM, "text-expense focus:text-expense [&_svg]:text-expense")}>
              <LogOut />
              {t("Sign out")}
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {switcher.pinPrompt}
    </>
  );
}
