"use client";

import Link from "next/link";
import Logo from "@/components/smartly/Logo";
import { ADMIN_HOME_ROUTE } from "@/lib/authUtils";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The panel's head, as the AdminSidebar board draws it: the mark on a 34px
// tile, the name, and the "Admin panel" tag under it. The board's wallet
// mark is the Smartly one here.
const SidebarBrand = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { translate } = useLocale();

  return (
    <Link href={ADMIN_HOME_ROUTE} onClick={onNavigate} aria-label={translate("Smartly admin home")} className="flex shrink-0 items-center gap-2.5 rounded-md px-2 pt-1 pb-5">
      <Logo variant="icon" height={34} alt="" className="rounded-[11px]" />
      <span className="flex flex-col">
        <span className="text-[15px] leading-[normal] font-bold text-white">{BRAND_NAME}</span>
        <span className="mt-0.5 self-start rounded-full bg-mint-200/14 px-1.75 py-px text-[11px] leading-[normal] font-semibold tracking-[0.02em] text-mint-200">
          {translate("Admin panel")}
        </span>
      </span>
    </Link>
  );
};

export default SidebarBrand;
