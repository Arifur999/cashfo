import type { Metadata } from "next";
import InvoiceLineItems from "@/components/modules/Admin/Invoices/InvoiceLineItems";
import PaymentDetailActions from "@/components/modules/Admin/Payments/PaymentDetailActions";
import PaymentFacts from "@/components/modules/Admin/Payments/PaymentFacts";
import PaymentSummaryHeader from "@/components/modules/Admin/Payments/PaymentSummaryHeader";
import RefundDetailsCard from "@/components/modules/Admin/Payments/RefundDetailsCard";
import Callout from "@/components/shared/Callout";
import SectionCard from "@/components/shared/SectionCard";
import { canManage } from "@/lib/authUtils";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { getUserInfo } from "@/services/auth.services";
import { getPaymentById } from "@/services/payment.services";

export const metadata: Metadata = { title: "Payment Details" };

const PaymentDetailPage = async ({ params }: PageProps<"/admin/payments/[id]">) => {
  const { id } = await params;
  const [payment, admin] = await Promise.all([fetchOrNotFound(getPaymentById(id)), getUserInfo()]);

  return (
    <div className="space-y-6">
      <PaymentSummaryHeader
        payment={payment}
        actions={canManage(admin?.role, "payments") && <PaymentDetailActions payment={payment} />}
      />
      <PaymentFacts payment={payment} />
      {payment.status === "FAILED" && payment.failureReason && (
        <Callout variant="danger">
          <strong>Failure reason:</strong> {payment.failureReason}
        </Callout>
      )}
      {payment.invoice && (
        <SectionCard title={`Invoice ${payment.invoice.invoiceNumber}`}>
          <InvoiceLineItems items={payment.invoice.lineItems} total={payment.invoice.totalAmount} currency={payment.currency} />
        </SectionCard>
      )}
      {payment.refund && <RefundDetailsCard refund={payment.refund} currency={payment.currency} />}
    </div>
  );
};

export default PaymentDetailPage;
