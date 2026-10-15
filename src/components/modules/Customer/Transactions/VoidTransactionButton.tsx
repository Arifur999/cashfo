"use client";

import { CircleOff } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { VoidTransactionDialog } from "./VoidTransactionDialog";

interface VoidTransactionButtonProps {
  businessId: string;
  transactionId: string;
  title: string;
}

// The Void button on a transaction's page: red outline, opens the dialog
// that asks why.
export function VoidTransactionButton({ businessId, transactionId, title }: VoidTransactionButtonProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="border-[#F2C9C0] text-expense hover:bg-expense-soft dark:border-expense/40">
        <CircleOff />
        {t("Void")}
      </Button>
      <VoidTransactionDialog open={open} onClose={() => setOpen(false)} businessId={businessId} transactionId={transactionId} title={title} />
    </>
  );
}
