"use server";

import type { Transaction } from "./api";
import { getAllTransactions } from "./transactions";

export interface PrintTransfersResult {
  success: boolean;
  data?: { transfers: Transaction[]; complete: boolean };
}

// Wallets › Transfer's Print: the history is paged on screen, so the paper
// copy loads every transfer in the period first (newest first, up to 1,000,
// as the page used to list them). `complete` is false when there were more.
// excludeSavings follows the page: an older backend refuses it, and its list
// then shows a goal's transfers too.
export async function listTransfersForPrintAction(businessId: string, period: { dateFrom?: string; dateTo?: string; excludeSavings: boolean }): Promise<PrintTransfersResult> {
  try {
    const { data, complete } = await getAllTransactions(businessId, {
      transactionType: "TRANSFER",
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      ...(period.excludeSavings && { excludeSavings: true }),
    });
    return { success: true, data: { transfers: data, complete } };
  } catch {
    // An outage (a 5xx, a 429, a timeout): the caller says it couldn't load.
    return { success: false };
  }
}
