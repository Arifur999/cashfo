"use client";

import { Info } from "lucide-react";
import Banner from "@/components/smartly/Banner";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Money Tracker became Smartly; the sign-in page says so for a while.
const RenameNotice = () => {
  const { translate } = useLocale();
  return (
    <Banner tone="mint" inline icon={<Info />} className="font-normal">
      {translate("Money Tracker is now")} <b>{BRAND_NAME}</b>. {translate("Same account, same data, a few new things inside.")}
    </Banner>
  );
};

export default RenameNotice;
