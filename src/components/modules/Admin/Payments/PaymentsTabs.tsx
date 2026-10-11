import TabsNav from "@/components/shared/TabsNav";

// Payments and Invoices are one "Payments" section in the sidebar.
const PaymentsTabs = () => {
  return (
    <TabsNav
      label="Payments views"
      tabs={[
        { label: "All Payments", href: "/admin/payments", exact: true },
        { label: "Failed Payments", href: "/admin/payments?view=failed", exact: true },
        { label: "Invoices", href: "/admin/invoices" },
      ]}
    />
  );
};

export default PaymentsTabs;
