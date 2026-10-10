"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { useTransition } from "react";
import { logoutAction } from "@/app/-actions/authActions";
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
import type { IAdminUser } from "@/types/auth.types";

const UserMenu = ({ admin }: { admin: IAdminUser }) => {
  const { translate } = useLocale();
  const [isLoggingOut, startLogout] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2" aria-label={translate("Account menu")}>
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{getInitials(admin.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">{admin.name}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-1.5 font-normal">
          <p className="truncate font-medium text-foreground">{admin.name}</p>
          <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
          <StatusBadgeCell status={admin.role} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
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
  );
};

export default UserMenu;
