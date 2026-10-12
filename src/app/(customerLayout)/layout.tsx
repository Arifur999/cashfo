import { redirect } from "next/navigation";
import CustomerTopBar from "@/components/modules/Customer/CustomerTopBar";
import { SESSION_EXPIRED_LOGIN_ROUTE } from "@/lib/authUtils";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getCustomerProfile } from "@/services/customer.services";

// The shell reads cookies (through getCustomerProfile), so it must be
// dynamic -- otherwise it gets statically cached for every customer.
export const dynamic = "force-dynamic";

// The customer app. proxy.ts already sent everyone else elsewhere; this
// catches a token the backend itself no longer accepts.
export default async function CustomerLayout({ children }: LayoutProps<"/">) {
  const customer = await getCustomerProfile();
  if (!customer) {
    redirect(SESSION_EXPIRED_LOGIN_ROUTE);
  }

  return (
    <LocaleProvider>
      <div className="flex min-h-screen flex-col bg-brand-content">
        <CustomerTopBar name={customer.name} email={customer.email} />
        {/* id + tabIndex give the root layout's skip link a focus target. */}
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 outline-none sm:px-6 md:py-12">
          {children}
        </main>
      </div>
    </LocaleProvider>
  );
}
