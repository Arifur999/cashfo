import TabsNav from "@/components/shared/TabsNav";

// Plans and Coupons are one "Subscriptions" section in the sidebar, so the
// two pages share its name as their title, and the tabs under it.
export const SUBSCRIPTIONS_PAGE = {
  title: "Subscriptions",
  description: "The plans people can buy, and the coupons that take money off them.",
} as const;

const SubscriptionsTabs = () => {
  return (
    <TabsNav
      label="Subscriptions"
      tabs={[
        { label: "Plans", href: "/admin/plans" },
        { label: "Coupons", href: "/admin/coupons" },
      ]}
    />
  );
};

export default SubscriptionsTabs;
