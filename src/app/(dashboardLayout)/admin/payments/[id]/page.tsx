import type { Metadata } from "next";
import DuplicateNote from "@/components/modules/Admin/Payments/DuplicateNote";
import OtherPaymentsCard from "@/components/modules/Admin/Payments/OtherPaymentsCard";
import PaidByCard from "@/components/modules/Admin/Payments/PaidByCard";
import PaymentDetailActions from "@/components/modules/Admin/Payments/PaymentDetailActions";
import PaymentDetailsCard from "@/components/modules/Admin/Payments/PaymentDetailsCard";
import PaymentHero from "@/components/modules/Admin/Payments/PaymentHero";
import { listQuery, paymentsListHref } from "@/components/modules/Admin/Payments/paymentsDisplay";
import PaymentTimeline from "@/components/modules/Admin/Payments/PaymentTimeline";
import RefundDetailsCard from "@/components/modules/Admin/Payments/RefundDetailsCard";
import BackLink from "@/components/shared/BackLink";
import { canManage } from "@/lib/authUtils";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { shortPaymentId } from "@/lib/payments";
import { getUserInfo } from "@/services/auth.services";
import { getPaymentById } from "@/services/payment.services";
import T from "@/components/shared/T";
import { getTranslator } from "@/lib/i18n/locale";

// "Payment PAY-3F2A1C9B" on the browser tab, from the id alone, so several
// open payments can be told apart without another read.
export const generateMetadata = async ({ params }: PageProps<"/admin/payments/[id]">): Promise<Metadata> => {
  const [{ id }, { t }] = await Promise.all([params, getTranslator("admin")]);
  return { title: t("Payment {id}", { id: shortPaymentId(id) }) };
};

const PaymentDetailPage = async ({ params, searchParams }: PageProps<"/admin/payments/[id]">) => {
  const [{ id }, { back }] = await Promise.all([params, searchParams]);
  // The list it was opened from (tab, filters, page), for every way back.
  const fromList = listQuery(Array.isArray(back) ? back[0] : back);
  const [payment, admin] = await Promise.all([fetchOrNotFound(getPaymentById(id)), getUserInfo()]);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={paymentsListHref(fromList)}><T>All payments</T></BackLink>
      <PaymentHero payment={payment} actions={<PaymentDetailActions payment={payment} canManage={canManage(admin?.role, "payments")} />} />
      {payment.duplicateOfId && <DuplicateNote payment={payment} back={fromList} />}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <PaymentDetailsCard payment={payment} />
          <PaymentTimeline payment={payment} />
          {payment.refund && <RefundDetailsCard refund={payment.refund} currency={payment.currency} />}
        </div>
        <div className="flex flex-col gap-4">
          <PaidByCard payment={payment} />
          <OtherPaymentsCard payments={payment.otherPayments} email={payment.platformUser?.email} back={fromList} />
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailPage;
