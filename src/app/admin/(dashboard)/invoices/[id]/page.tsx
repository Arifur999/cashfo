import { notFound } from "next/navigation";
import { getInvoiceById } from "@/lib/invoices";
import { t } from "@/lib/i18n/t";

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm shadow-black/5">
        <h1 className="text-xl font-semibold text-neutral-900">{invoice.invoiceNumber}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Issued to")} {invoice.issuedTo}</p>
        <p className="mt-1 text-xs text-neutral-400">{new Date(invoice.createdAt).toLocaleString()}</p>
        <p className="mt-2 text-xs text-neutral-400">{t("PDF download coming soon")}</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm shadow-black/5">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">{t("Line Items")}</h2>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="py-2 font-medium">{t("Description")}</th>
              <th className="py-2 text-right font-medium">{t("Amount")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {invoice.lineItems.map((item, i) => (
              <tr key={i}>
                <td className="py-2 text-neutral-600">{item.description}</td>
                <td className="py-2 text-right text-neutral-900">{item.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex justify-end text-sm font-semibold text-neutral-900">
          {t("Total")}: {invoice.totalAmount}
        </div>
      </div>
    </div>
  );
}
