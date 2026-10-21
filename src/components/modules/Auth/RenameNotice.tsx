"use client";

import { Info } from "lucide-react";
import T from "@/components/shared/T";
import Banner from "@/components/smartly/Banner";
import { BRAND_NAME } from "@/lib/brand";

// Money Tracker became Smartly; the sign-in page says so for a while, under
// the form. One sentence with the name filled in, so Bangla ends it with ।.
const RenameNotice = () => (
  <Banner tone="mint" inline icon={<Info />} className="font-normal">
    <T values={{ brand: <b>{BRAND_NAME}</b> }}>{"Money Tracker is now {brand}. Same account, same data, a few new things inside."}</T>
  </Banner>
);

export default RenameNotice;
