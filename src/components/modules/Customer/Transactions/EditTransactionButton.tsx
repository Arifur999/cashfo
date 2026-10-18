"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { TransactionDrawer } from "@/components/modules/Customer/QuickEntry/TransactionDrawer";
import Button from "@/components/smartly/Button";
import type { EditableEntry } from "@/lib/customer/transactionRows";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface EditTransactionButtonProps {
  businessId: string;
  currency: string;
  entry: EditableEntry;
}

// The Edit button on a transaction's page (decision D2): the transaction
// drawer filled in with the entry; saving voids it and posts the corrected
// one, then opens that.
export function EditTransactionButton({ businessId, currency, entry }: EditTransactionButtonProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Pencil />
        {t("Edit")}
      </Button>
      <TransactionDrawer open={open} onClose={() => setOpen(false)} businessId={businessId} currency={currency} editing={entry} />
    </>
  );
}
