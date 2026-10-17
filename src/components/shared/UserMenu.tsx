"use client";

import { ChevronDown, KeyRound, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { logoutAction } from "@/app/-actions/authActions";
import ChangeOwnPasswordForm from "@/components/modules/Admin/Account/ChangeOwnPasswordForm";
import FormDialog from "@/components/shared/dialog/FormDialog";
import Loader from "@/components/shared/Loader";
import Avatar from "@/components/smartly/Avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ADMIN_ROLE_TONE, adminRoleLabel } from "@/lib/adminRoles";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/types/auth.types";

interface UserMenuProps {
  name: string;
  email: string;
  // Admins see their role under their name; customers have none to show.
  role?: AdminRole;
}

const ITEM = "flex min-h-11 cursor-pointer items-center gap-3 rounded-none px-4 py-2 text-body font-medium text-ink focus:bg-cream [&_svg]:size-4.5 [&_svg]:text-ink-2";

// The signed-in account in the top bar, with Log out -- for admins and
// customers alike -- and, for admins (who have a role), Change password.
const UserMenu = ({ name, email, role }: UserMenuProps) => {
  const { translate } = useLocale();
  const [isLoggingOut, startLogout] = useTransition();
  const [changingPassword, setChangingPassword] = useState(false);
  const adminRole = role ?? null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={translate("Account menu")} className="flex h-11 shrink-0 items-center gap-3 rounded-full pr-0 pl-1 md:pr-2 data-open:bg-surface-sunken">
          <Avatar name={name} size={36} />
          <span className="hidden flex-col items-start md:flex">
            <span className="max-w-40 truncate text-small font-semibold whitespace-nowrap text-ink">{name}</span>
            {adminRole && <span className={cn("text-caption font-semibold whitespace-nowrap", ADMIN_ROLE_TONE[adminRole])}>{translate(adminRoleLabel(adminRole))}</span>}
          </span>
          <ChevronDown className="hidden size-4 text-ink-muted md:block" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-80 rounded-lg border border-line bg-surface p-0 shadow-overlay ring-0">
          <div className="flex items-center gap-3 p-4">
            <Avatar name={name} size={44} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body font-bold text-ink">{name}</span>
              <span className="truncate text-small text-ink-muted">{email}</span>
            </span>
          </div>
          <DropdownMenuSeparator className="m-0 bg-line" />
          <div className="py-2">
            {adminRole && (
              <DropdownMenuItem asChild className={ITEM}>
                <Link href="/admin/account">
                  <UserRound aria-hidden="true" />
                  {translate("My account")}
                </Link>
              </DropdownMenuItem>
            )}
            {adminRole && (
              <DropdownMenuItem onSelect={() => setChangingPassword(true)} className={ITEM}>
                <KeyRound aria-hidden="true" />
                {translate("Change password")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={isLoggingOut}
              onSelect={(event) => {
                // Keep the menu open on the spinner until the redirect lands.
                event.preventDefault();
                startLogout(() => logoutAction());
              }}
              className={cn(ITEM, "text-expense focus:text-expense [&_svg]:text-expense")}
            >
              {isLoggingOut ? <Loader size={14} label={translate("Log out")} /> : <LogOut aria-hidden="true" />}
              {translate("Log out")}
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {adminRole && (
        <FormDialog open={changingPassword} onOpenChange={setChangingPassword} title="Change password" description={email} size="sm">
          <ChangeOwnPasswordForm onDone={() => setChangingPassword(false)} />
        </FormDialog>
      )}
    </>
  );
};

export default UserMenu;
