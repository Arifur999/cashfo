import Link from "next/link";
import { Eye } from "lucide-react";
import { getInvoices } from "@/lib/invoices";
import { TabsNav } from "@/components/ui/TabsNav";
import { t } from "@/lib/i18n/t";

interface InvoicesPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const queryString = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]).toString();
  const { data: invoices } = await getInvoices(queryString);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Invoices")}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t("Generated for every successful payment.")} <span className="text-neutral-400">({t("PDF download coming soon")})</span>
        </p>
      </div>

      <TabsNav
        tabs={[
          { label: t("All Payments"), href: "/admin/payments", exact: true },
          { label: t("Failed Payments"), href: "/admin/payments?view=failed", exact: true },
          { label: t("Invoices"), href: "/admin/invoices" },
        ]}
      />

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Invoice #")}</th>
              <th className="px-4 py-3 font-medium">{t("Issued To")}</th>
              <th className="px-4 py-3 font-medium">{t("Amount")}</th>
              <th className="px-4 py-3 font-medium">{t("Date")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-mono font-medium text-neutral-900">{invoice.invoiceNumber}</td>
                <td className="px-4 py-3 text-neutral-500">{invoice.issuedTo}</td>
                <td className="px-4 py-3 text-neutral-900">{invoice.totalAmount}</td>
                <td className="px-4 py-3 text-neutral-500">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/invoices/${invoice.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
                  >
                    <Eye className="h-3.5 w-3.5" /> {t("View")}
                  </Link>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                  {t("No invoices yet.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
