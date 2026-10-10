import TabsNav from "@/components/shared/TabsNav";

// Plans and Coupons are one "Subscriptions" section in the sidebar.
const SubscriptionsTabs = () => {
  return (
    <TabsNav
      tabs={[
        { label: "Plans", href: "/admin/plans" },
        { label: "Coupons", href: "/admin/coupons" },
      ]}
    />
  );
};

export default SubscriptionsTabs;
