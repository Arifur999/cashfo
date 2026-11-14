// The Zakat calculator's shapes, as GET /api/businesses/:id/zakat answers
// them. Money is a 2-decimal string; prices are whole taka per vori.

export type ZakatCheckStep = "CASH" | "SAVINGS" | "GOLD" | "INVESTMENTS" | "OWED_TO_YOU" | "YOU_OWE";
export type ZakatStepId = ZakatCheckStep | "NOT_COUNTED";
export type ZakatMetal = "GOLD_22" | "GOLD_21" | "GOLD_18" | "GOLD_TRADITIONAL" | "SILVER_22";
export type ZakatBasis = "SILVER" | "GOLD";
export type ZakatDateMode = "RAMADAN" | "MUHARRAM" | "CUSTOM";
export type ZakatDebtMode = "YEAR" | "FULL";

export interface ZakatLine {
  // "account:<id>", "asset:<id>", "investment:<id>", "contact:<id>" or "extra:<id>".
  key: string;
  source: "ACCOUNT" | "ASSET" | "INVESTMENT" | "CONTACT" | "EXTRA";
  id: string;
  name: string;
  // An account's subtype or "•••• 7890"; an asset's category; an
  // investment's kind; a contact's category (BUSINESS or LOAN); null for a
  // line added by hand.
  detail: string | null;
  amount: string;
  counted: boolean;
  // Gold and silver: the metal and weight, and whether today's price valued
  // it (else the value written in Assets).
  metal?: ZakatMetal | null;
  weightVori?: string | null;
  byWeight?: boolean;
  // A debt: the whole of it, what falls due within 12 months, and which one
  // is taken off.
  fullAmount?: string;
  yearAmount?: string;
  debtMode?: ZakatDebtMode;
  // An asset not counted (land, a flat, a car): true once it was bought to
  // sell and so moved under Investments.
  forSale?: boolean;
  // An investment's maturity day, null when it has none.
  maturesOn?: string | null;
  // A wallet's number as "•••• 7890" (its subtype is the detail), and
  // its Bangla name when it has one.
  number?: string | null;
  nameBn?: string | null;
}

export interface ZakatStep {
  step: ZakatStepId;
  total: string;
  checked: boolean;
  lines: ZakatLine[];
}

export interface ZakatPayment {
  id: string;
  amount: string;
  paidOn: string;
  accountId: string;
  givenTo: string | null;
  transactionId: string;
}

export interface ZakatSummary {
  today: string;
  // The day this zakat year is due, and its Hijri year (null for a custom date).
  dueDate: string;
  hijriYear: number | null;
  daysLeft: number;
  // What 1 Ramadan and 1 Muharram come to next, for the settings' labels.
  dateChoices: Record<"RAMADAN" | "MUHARRAM", { date: string; hijriYear: number | null }>;
  settings: {
    basis: ZakatBasis;
    dateMode: ZakatDateMode;
    customDate: string | null;
    // The member's own prices; null uses the platform's (BAJUS).
    goldPrice: string | null;
    silverPrice: string | null;
  };
  prices: {
    gold22: number;
    silver22: number;
    perVori: Record<ZakatMetal, number>;
    own: boolean;
    platform: { gold22: number; silver22: number; on: string };
  };
  nisab: string;
  aboveNisab: boolean;
  steps: ZakatStep[];
  totals: {
    have: string;
    // Zakat given this year from a counted wallet, counted back in.
    givenBack: string;
    owed: string;
    owe: string;
    net: string;
    zakat: string;
    paid: string;
    left: string;
    parts: number;
    perPart: string;
  };
  payments: ZakatPayment[];
}

export interface ZakatSettingsInput {
  basis: ZakatBasis;
  dateMode: ZakatDateMode;
  customDate?: string;
  // null goes back to the platform's price.
  goldPrice: number | null;
  silverPrice: number | null;
}

export type ZakatExtraInput = { group: ZakatCheckStep; name: string } & ({ amount: number } | { metal: ZakatMetal; weightVori: number });

export interface ZakatPaymentInput {
  amount: number;
  paidOn: string;
  accountId: string;
  givenTo?: string;
}

// Admin › Settings › Zakat prices.
export interface ZakatPrices {
  gold22: number;
  silver22: number;
  on: string;
  updatedAt: string | null;
  updatedBy: string | null;
}
