import TabsNav from "@/components/shared/TabsNav";

// Payments, Invoices and Revenue are one "Payments" section in the sidebar,
// so the three pages share a title and the tabs under it.
export const PAYMENTS_PAGE = {
  title: "Payments",
  description: "Every payment for a plan, with refunds, invoices and the money coming in each month.",
} as const;

// Revenue is for finance roles only; everyone else doesn't see the tab.
const PaymentsTabs = ({ showRevenue }: { showRevenue: boolean }) => {
  return (
    <TabsNav
      label="Payments"
      tabs={[
        { label: "Payments", href: "/admin/payments" },
        { label: "Invoices", href: "/admin/invoices" },
        ...(showRevenue ? [{ label: "Revenue", href: "/admin/revenue" }] : []),
      ]}
    />
  );
};

export default PaymentsTabs;
