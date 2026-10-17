import type { Metadata } from "next";
import DuplicateNote from "@/components/modules/Admin/Payments/DuplicateNote";
import OtherPaymentsCard from "@/components/modules/Admin/Payments/OtherPaymentsCard";
import PaidByCard from "@/components/modules/Admin/Payments/PaidByCard";
import PaymentDetailActions from "@/components/modules/Admin/Payments/PaymentDetailActions";
import PaymentDetailsCard from "@/components/modules/Admin/Payments/PaymentDetailsCard";
import PaymentHero from "@/components/modules/Admin/Payments/PaymentHero";
import PaymentTimeline from "@/components/modules/Admin/Payments/PaymentTimeline";
import RefundDetailsCard from "@/components/modules/Admin/Payments/RefundDetailsCard";
import BackLink from "@/components/shared/BackLink";
import { canManage } from "@/lib/authUtils";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { getUserInfo } from "@/services/auth.services";
import { getPaymentById } from "@/services/payment.services";
import T from "@/components/shared/T";

export const metadata: Metadata = { title: "Payment" };

const PaymentDetailPage = async ({ params }: PageProps<"/admin/payments/[id]">) => {
  const { id } = await params;
  const [payment, admin] = await Promise.all([fetchOrNotFound(getPaymentById(id)), getUserInfo()]);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/admin/payments"><T>All payments</T></BackLink>
      <PaymentHero payment={payment} actions={canManage(admin?.role, "payments") && <PaymentDetailActions payment={payment} />} />
      {payment.duplicateOfId && <DuplicateNote payment={payment} />}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <PaymentDetailsCard payment={payment} />
          <PaymentTimeline payment={payment} />
          {payment.refund && <RefundDetailsCard refund={payment.refund} currency={payment.currency} />}
        </div>
        <div className="flex flex-col gap-4">
          <PaidByCard payment={payment} />
          <OtherPaymentsCard payments={payment.otherPayments} />
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailPage;
