"use client";

import Link from "next/link";
import Chip from "@/components/smartly/Chip";
import Logo from "@/components/smartly/Logo";
import { ADMIN_HOME_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The logo with the Admin tag, at the top of the Night sidebar.
const SidebarBrand = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { translate } = useLocale();

  return (
    <Link href={ADMIN_HOME_ROUTE} onClick={onNavigate} aria-label={translate("Smartly admin home")} className="mb-3 flex h-11 shrink-0 items-center gap-3 rounded-md px-2">
      <Logo onDark height={38} alt="" />
      <Chip tone="onDark" size="sm" className="text-mint-200">
        {translate("Admin")}
      </Chip>
    </Link>
  );
};

export default SidebarBrand;
