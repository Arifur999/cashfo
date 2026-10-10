import { notFound } from "next/navigation";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { getPaymentById } from "@/lib/payments";
import { GatewayBadge } from "@/components/payments/GatewayBadge";
import { PaymentDetailActions } from "@/components/payments/PaymentDetailActions";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { t } from "@/lib/i18n/t";

interface PaymentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentDetailPage({ params }: PaymentDetailPageProps) {
  const { id } = await params;
  const [payment, admin] = await Promise.all([getPaymentById(id), getCurrentAdmin()]);

  if (!payment) {
    notFound();
  }

  const canManage = admin?.role === "SUPER_ADMIN" || admin?.role === "FINANCE_ADMIN";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-neutral-900">
                {payment.currency} {payment.amount}
              </h1>
              <PaymentStatusBadge status={payment.status} />
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {payment.platformUser?.name} &middot; {payment.platformUser?.email}
            </p>
            <p className="mt-1 text-xs text-neutral-400">{new Date(payment.createdAt).toLocaleString()}</p>
          </div>
          <PaymentDetailActions payment={payment} canManage={canManage} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
          <p className="text-xs font-medium uppercase text-neutral-400">{t("Plan")}</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900">{payment.plan.name}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
          <p className="text-xs font-medium uppercase text-neutral-400">{t("Gateway")}</p>
          <div className="mt-1">
            <GatewayBadge gateway={payment.gateway} />
          </div>
          {payment.gatewayReferenceId && <p className="mt-1 text-xs text-neutral-400">{payment.gatewayReferenceId}</p>}
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
          <p className="text-xs font-medium uppercase text-neutral-400">{t("Paid At")}</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900">
            {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : "—"}
          </p>
        </div>
      </div>

      {payment.status === "FAILED" && payment.failureReason && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">
          <strong>{t("Failure reason")}:</strong> {payment.failureReason}
        </div>
      )}

      {payment.invoice && (
        <div className="rounded-2xl bg-white p-6 shadow-sm shadow-black/5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">
            {t("Invoice")} {payment.invoice.invoiceNumber}
          </h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
              <tr>
                <th className="py-2 font-medium">{t("Description")}</th>
                <th className="py-2 text-right font-medium">{t("Amount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {payment.invoice.lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="py-2 text-neutral-600">{item.description}</td>
                  <td className="py-2 text-right text-neutral-900">{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex justify-end text-sm font-semibold text-neutral-900">
            {t("Total")}: {payment.currency} {payment.invoice.totalAmount}
          </div>
        </div>
      )}

      {payment.refund && (
        <div className="rounded-2xl bg-neutral-50 p-5">
          <h2 className="mb-2 text-sm font-semibold text-neutral-900">{t("Refund Details")}</h2>
          <p className="text-sm text-neutral-600">
            {t("Amount")}: {payment.currency} {payment.refund.amount}
          </p>
          <p className="text-sm text-neutral-600">
            {t("Reason")}: {payment.refund.reason}
          </p>
          <p className="text-xs text-neutral-400">
            {t("Status")}: {payment.refund.status} &middot; {new Date(payment.refund.createdAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
