"use client";

import { Mail } from "lucide-react";
import { emailInvoiceAction } from "@/app/(dashboardLayout)/admin/invoices/_action";
import Button from "@/components/smartly/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";

// "Email to Nusrat": sends the invoice, PDF attached, to the person who
// paid, and says where it went.
const InvoiceEmailButton = ({ invoiceId, firstName }: { invoiceId: string; firstName: string | null }) => {
  const { translate } = useLocale();
  const { run, isPending } = useActionMutation({
    action: () => emailInvoiceAction(invoiceId),
    successMessage: (data) => translate("Invoice sent to {email}", { email: data.sentTo }),
    invalidateKeys: [queryKeys.invoices.all],
  });
  return (
    <Button type="button" variant="secondary" size="md" className="w-full" disabled={isPending} onClick={() => void run(undefined)}>
      <Mail className="size-4 text-ink-2" aria-hidden="true" />
      {isPending ? translate("Sending...") : firstName ? translate("Email to {name}", { name: firstName }) : translate("Email the invoice")}
    </Button>
  );
};

export default InvoiceEmailButton;
