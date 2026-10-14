"use client";

import { Briefcase, Check, ChevronDown, Gift, Lock, LogOut, Settings, User, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Avatar from "@/components/smartly/Avatar";
import IconTile from "@/components/smartly/IconTile";
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
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { workspaceKind } from "./workspaceKind";

const ITEM = "flex min-h-11 cursor-pointer items-center gap-3 rounded-none px-4 py-2 text-body font-medium text-ink focus:bg-cream [&_svg]:size-4.5 [&_svg]:text-ink-2";

// The top bar's account button and its menu: who is signed in, the open
// workspace, the links to settings and referrals, lock and sign out.
export function AccountMenu() {
  const { user, activeBusiness, logout } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const kind = workspaceKind(activeBusiness);
  const workspaceName = activeBusiness?.isDefault ? user.name : (activeBusiness?.name ?? user.name);

  function lock() {
    if (!activeBusiness) return;
    startTransition(async () => {
      await lockWorkspaceAction(activeBusiness.id);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${t("Account menu")} — ${user.name}, ${t(kind)}`}
        className="flex h-11 shrink-0 items-center gap-3 rounded-full pr-0 pl-1 md:ml-1 md:pr-3 data-open:bg-surface-sunken"
      >
        <Avatar name={user.name} src={user.avatarUrl} size={36} />
        <span className="hidden flex-col items-start md:flex">
          <span className="text-small font-semibold whitespace-nowrap text-ink">{firstName}</span>
          <span className="text-caption font-normal whitespace-nowrap text-ink-muted">{t(kind)}</span>
        </span>
        <ChevronDown className="hidden size-4 text-ink-muted md:block" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-85 rounded-lg border border-line bg-surface p-0 shadow-overlay ring-0">
        <div className="flex items-center gap-3 p-4">
          <Avatar name={user.name} src={user.avatarUrl} size={44} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-body font-bold text-ink">{user.name}</span>
            <span className="truncate text-small text-ink-muted">{user.email}</span>
          </span>
        </div>

        <DropdownMenuGroup className="border-t border-line py-2">
          <DropdownMenuLabel className="px-4 pt-1 pb-2 text-overline text-ink-muted uppercase">{t("Workspace")}</DropdownMenuLabel>
          <div role="menuitemradio" aria-checked="true" className="flex items-center gap-3 bg-mint-50 px-4 py-2 text-ink">
            <IconTile tone={kind === "Business" ? "loans" : "white"} size={32} className={cn(kind !== "Business" && "bg-surface")}>
              {kind === "Business" ? <Briefcase /> : kind === "Group" ? <Users /> : <User />}
            </IconTile>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-semibold">{workspaceName}</span>
              <span className="text-caption font-normal text-ink-muted">{t(`${kind} workspace`)}</span>
            </span>
            <Check className="size-4.5 text-emerald" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <DropdownMenuItem asChild className={ITEM}>
            <Link href="/settings/workspaces">
              <Settings />
              {t("Manage workspaces")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuGroup className="border-t border-line py-2">
          <DropdownMenuItem asChild className={ITEM}>
            <Link href="/settings">
              <User />
              {t("Profile and settings")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM}>
            <Link href="/referrals">
              <Gift />
              {t("Invite & earn")}
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
  );
}
