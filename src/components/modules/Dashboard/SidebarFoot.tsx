"use client";

import Avatar from "@/components/smartly/Avatar";
import { adminRoleLabel } from "@/lib/adminRoles";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IAdminUser } from "@/types/auth.types";

// Who is signed in, at the foot of the Night sidebar.
const SidebarFoot = ({ admin }: { admin: IAdminUser }) => {
  const { translate } = useLocale();
  const roleLine = admin.role === "SUPER_ADMIN" ? `${translate("Super admin")} · ${translate("full access")}` : translate(adminRoleLabel(admin.role));

  return (
    <div className="mt-2 flex items-center gap-3 border-t border-mint-200/12 px-2 pt-3">
      <Avatar name={admin.name} size={36} tone="glow" className="text-caption" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-small font-semibold text-white">{admin.name}</span>
        <span className="text-caption font-normal text-mint-200/72">{roleLine}</span>
      </span>
    </div>
  );
};

export default SidebarFoot;
