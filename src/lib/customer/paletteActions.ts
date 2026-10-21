"use server";

import { unstable_rethrow } from "next/navigation";
import { resolveActiveBusinessId } from "./activeBusiness";
import type { Contact, ContactCategory, ContactType, Transaction, TransactionType } from "./api";
import { getCurrentUser } from "./auth";
import { getContacts } from "./contacts";
import { describeTransaction, type CategoryMeta } from "./transactionRows";
import { getTransactions } from "./transactions";

// What the search palette shows of a contact and a transaction: only what
// its rows draw, never the whole record.
export interface PaletteContact {
  id: string;
  name: string;
  type: ContactType;
  category: ContactCategory;
  phone: string | null;
}

export interface PaletteTransaction {
  id: string;
  // The note, else the category; null when it has neither (the row then
  // names its type).
  title: string | null;
  type: TransactionType;
  date: string;
  // Positive for money in, negative for money out.
  amount: number;
  wallet: string | null;
  cancelled: "Voided" | "Reversal" | null;
}

export interface PaletteResults {
  contacts: PaletteContact[];
  transactions: PaletteTransaction[];
}

export interface PaletteSearchResult {
  success: boolean;
  data?: PaletteResults;
}

const LIMIT = 5;
const MIN_QUERY = 2;
const MAX_QUERY = 100;
const NOTHING: PaletteResults = { contacts: [], transactions: [] };
// What the Transactions page lists (its Income & Expense list), so the rows
// found here are the ones "See all matching transactions" opens on.
// Transfers and the books' postings live on pages of their own.
const LISTED_TYPES: TransactionType[] = ["INCOME", "EXPENSE"];

// An entry's categoryId holds the category's name, so it names itself; an
// id-shaped value would print as a code, and is left out.
const ID_SHAPED = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
const categoryNames = (transaction: Transaction): Record<string, CategoryMeta> =>
  Object.fromEntries(transaction.entries.flatMap((entry) => (entry.categoryId && !ID_SHAPED.test(entry.categoryId) ? [[entry.categoryId, { name: entry.categoryId, icon: null, color: "" }]] : [])));

const toContact = (contact: Contact): PaletteContact => ({ id: contact.id, name: contact.name, type: contact.type, category: contact.category, phone: contact.phone });

const toTransaction = (transaction: Transaction): PaletteTransaction => {
  const row = describeTransaction(transaction, categoryNames(transaction));
  return { id: transaction.id, title: row.title, type: transaction.transactionType, date: transaction.transactionDate, amount: row.signedAmount, wallet: row.wallet, cancelled: row.cancelled };
};

// The palette's people and transactions for what was typed, in the open
// workspace -- worked out here from the session, never taken from the
// browser. The two list endpoints the Contacts and Transactions pages read
// answer it, five of each, with the Transactions page's own types. A failed
// read answers "nothing found"; a redirect (maintenance, a workspace that
// wants its PIN again) still goes through.
export async function searchPaletteAction(query: string): Promise<PaletteSearchResult> {
  const search = typeof query === "string" ? query.trim().slice(0, MAX_QUERY) : "";
  if (search.length < MIN_QUERY) return { success: true, data: NOTHING };
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };
    const businessId = await resolveActiveBusinessId(user.businesses);
    if (!businessId) return { success: false };
    const [contacts, transactions] = await Promise.all([getContacts(businessId, { search, limit: LIMIT }), getTransactions(businessId, { search, limit: LIMIT, transactionTypes: LISTED_TYPES })]);
    return { success: true, data: { contacts: contacts.data.slice(0, LIMIT).map(toContact), transactions: transactions.data.slice(0, LIMIT).map(toTransaction) } };
  } catch (error) {
    unstable_rethrow(error);
    return { success: false };
  }
}
