import type { Metadata } from "next";
import CustomerWelcome from "@/components/modules/Customer/CustomerWelcome";
import { getCustomerProfile } from "@/services/customer.services";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function CustomerDashboardPage() {
  // Request-cached: the layout already fetched it, and redirected if it
  // came back empty.
  const customer = await getCustomerProfile();
  if (!customer) {
    return null;
  }

  return <CustomerWelcome name={customer.name} workspaces={customer.businesses} />;
}
