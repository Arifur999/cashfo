"use server";

import { requireId, runAction } from "@/lib/runAction";
import { emailInvoice } from "@/services/invoice.services";

export const emailInvoiceAction = async (invoiceId: string) =>
  requireId(invoiceId, "invoice") ?? runAction("Failed to email the invoice", () => emailInvoice(invoiceId));
