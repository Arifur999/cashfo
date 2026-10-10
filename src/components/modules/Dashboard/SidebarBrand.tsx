"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import { DEFAULT_DASHBOARD_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const SidebarBrand = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { translate } = useLocale();

  return (
    <Link href={DEFAULT_DASHBOARD_ROUTE} onClick={onNavigate} className="flex h-16 shrink-0 items-center gap-2.5 px-6">
      <span className="flex size-8 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
        <Wallet className="size-4" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold tracking-wide">{translate("Admin Panel")}</span>
    </Link>
  );
};

export default SidebarBrand;
