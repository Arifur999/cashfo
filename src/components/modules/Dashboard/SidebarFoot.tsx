"use client";

import { adminRoleLabel } from "@/lib/adminRoles";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getInitials } from "@/lib/text";
import type { IAdminUser } from "@/types/auth.types";

// Who is signed in, at the foot of the panel: initials on the primary with
// a mint ring, the name, and the role ("Super admin · full access").
const SidebarFoot = ({ admin }: { admin: IAdminUser }) => {
  const { translate } = useLocale();
  const roleLine = admin.role === "SUPER_ADMIN" ? `${translate("Super admin")} · ${translate("full access")}` : translate(adminRoleLabel(admin.role));

  return (
    <div className="flex shrink-0 items-center gap-2.5 border-t border-mint-200/16 px-2 pt-3">
      <span
        aria-hidden="true"
        className="flex size-8.5 shrink-0 items-center justify-center rounded-full bg-emerald text-caption font-bold text-white ring-2 ring-mint-200/35"
      >
        {getInitials(admin.name) || "?"}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13.5px] leading-[normal] font-semibold text-white">{admin.name}</span>
        <span className="text-caption text-mint-200/75">{roleLine}</span>
      </span>
    </div>
  );
};

export default SidebarFoot;
