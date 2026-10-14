"use client";

import { ChevronDown, KeyRound, LogOut } from "lucide-react";
import { useState, useTransition } from "react";
import { logoutAction } from "@/app/-actions/authActions";
import ChangeOwnPasswordForm from "@/components/modules/Admin/Account/ChangeOwnPasswordForm";
import FormDialog from "@/components/shared/dialog/FormDialog";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import Loader from "@/components/shared/Loader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getInitials } from "@/lib/text";
interface UserMenuProps {
  name: string;
  email: string;
  // Admins see their role under their email; customers have none to show.
  role?: string;
}

// The signed-in account in the top bar, with Log out -- for admins and
// customers alike -- and, for admins (who have a role), Change password.
const UserMenu = ({ name, email, role }: UserMenuProps) => {
  const { translate } = useLocale();
  const [isLoggingOut, startLogout] = useTransition();
  const [changingPassword, setChangingPassword] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2" aria-label={translate("Account menu")}>
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">{name}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="space-y-1.5 font-normal">
            <p className="truncate font-medium text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
            {role && <StatusBadgeCell status={role} />}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {role && (
            <DropdownMenuItem onSelect={() => setChangingPassword(true)}>
              <KeyRound aria-hidden="true" />
              {translate("Change password")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            disabled={isLoggingOut}
            onSelect={(event) => {
              // Keep the menu open on the spinner until the redirect lands.
              event.preventDefault();
              startLogout(() => logoutAction());
            }}
          >
            {isLoggingOut ? <Loader size={14} label={translate("Log out")} /> : <LogOut aria-hidden="true" />}
            {translate("Log out")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {role && (
        <FormDialog open={changingPassword} onOpenChange={setChangingPassword} title="Change password" description={email} size="sm">
          <ChangeOwnPasswordForm onDone={() => setChangingPassword(false)} />
        </FormDialog>
      )}
    </>
  );
};

export default UserMenu;
