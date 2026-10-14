"use client";

import { Gift } from "lucide-react";
import Banner from "@/components/smartly/Banner";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Shown on sign-up when it came from someone's ?ref= invite link. A Google
// sign-up doesn't carry the code -- only the form below does.
const InviteCodeNotice = ({ code }: { code: string }) => {
  const { translate } = useLocale();

  return (
    <Banner tone="mint" inline icon={<Gift />} className="font-normal">
      {translate("Invite code applied:")} <span className="font-mono font-medium">{code}</span>
    </Banner>
  );
};

export default InviteCodeNotice;
