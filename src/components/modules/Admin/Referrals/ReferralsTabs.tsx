import TabsNav from "@/components/shared/TabsNav";
import { REFERRAL_SETTINGS_HREF, REFERRALS_HREF, REFERRALS_LIST_HREF } from "./payoutsDisplay";

// The three pages share one title; each says what it is for under it.
export const REFERRALS_PAGE_TITLE = "Referrals & Payouts";

export const REFERRALS_PAGE_DESCRIPTION = {
  payouts: "Approve withdrawal requests, send the money, then record the transaction ID.",
  referrals: "Every friend who joined with a member's link, and the commission they earned.",
  settings: "How much people earn, what their friends save, and how withdrawals work.",
} as const;

// Payouts is the section's own address, so it is matched exactly: the
// other two live under it.
const ReferralsTabs = () => (
  <TabsNav
    label="Referral admin"
    tabs={[
      { label: "Payouts", href: REFERRALS_HREF, exact: true },
      { label: "Referrals", href: REFERRALS_LIST_HREF },
      { label: "Settings", href: REFERRAL_SETTINGS_HREF },
    ]}
  />
);

export default ReferralsTabs;
