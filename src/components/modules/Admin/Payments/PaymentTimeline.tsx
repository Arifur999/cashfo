import { formatDate } from "@/lib/date";
import { paymentSteps } from "@/lib/payments";
import { cn } from "@/lib/utils";
import type { IPaymentDetail } from "@/types/payment.types";

const DOT = { neutral: "bg-ink-muted", success: "bg-emerald", danger: "bg-expense-fill", warning: "bg-warning-fill" } as const;

// "What happened": the payment's steps down a line, each with its time.
const PaymentTimeline = ({ payment }: { payment: IPaymentDetail }) => {
  const steps = paymentSteps(payment);
  return (
    <section aria-labelledby="payment-timeline" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 shadow-card">
      <h2 id="payment-timeline" className="text-title text-ink">
        What happened
      </h2>
      <ol className="flex flex-col">
        {steps.map((step, index) => (
          <li key={`${step.what}-${index}`} className="flex min-h-11 gap-3">
            <span className="flex flex-col items-center">
              <span className={cn("mt-0.75 size-3 shrink-0 rounded-full", DOT[step.tone])} aria-hidden="true" />
              {index < steps.length - 1 && <span className="w-0.5 grow bg-line" aria-hidden="true" />}
            </span>
            <span className="flex grow justify-between gap-3 text-body">
              <span className="text-ink">{step.what}</span>
              <span className="whitespace-nowrap text-ink-muted tabular-nums">{formatDate(step.at, "h:mm:ss aaa")}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default PaymentTimeline;
