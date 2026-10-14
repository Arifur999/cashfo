import { redirect } from "next/navigation";
import { isFeatureOn } from "@/lib/customer/features";
import { getPlatform } from "@/lib/customer/platform";

// Loan Management is behind the loan_management feature flag (Admin > System
// > Feature Flags): when it's off the sidebar hides the section and its pages
// send the customer to the dashboard.
export default async function LoanManagementLayout({ children }: LayoutProps<"/loan-management">) {
  const { flags } = await getPlatform();
  if (!isFeatureOn(flags, "loan_management")) {
    redirect("/dashboard");
  }
  return children;
}
