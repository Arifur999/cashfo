"use client";

import Callout from "@/components/shared/Callout";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Shown on sign-up when it came from someone's ?ref= invite link. A Google
// sign-up doesn't carry the code -- only the form below does.
const InviteCodeNotice = ({ code }: { code: string }) => {
  const { translate } = useLocale();

  return (
    <Callout role="status">
      {translate("Invite code applied:")} <span className="font-mono font-medium text-foreground">{code}</span>
    </Callout>
  );
};

export default InviteCodeNotice;
