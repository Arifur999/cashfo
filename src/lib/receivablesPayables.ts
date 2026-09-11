// Server-only helpers, same shape as lib/accounts.ts.
import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type AgingReport, type ContactBalanceDetail, type LoanDashboard, type LoanStatement, type OverdueRow } from "./api";
import { getAccessToken } from "./tokenCookies";

const EMPTY_DIRECTION = { totalInvoiced: "0.00", totalPaid: "0.00", remaining: "0.00", transactions: [] };
const EMPTY_DETAIL: ContactBalanceDetail = {
  contactId: "",
  openingBalance: "0.00",
  currentBalance: "0.00",
  receivable: EMPTY_DIRECTION,
  payable: EMPTY_DIRECTION,
};

export const getContactBalanceDetail = cache(async (businessId: string, contactId: string): Promise<ContactBalanceDetail> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return EMPTY_DETAIL;

  try {
    const response = await axios.get<ContactBalanceDetail>(`${API_BASE_URL}/api/businesses/${businessId}/contacts/${contactId}/balance-detail`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return EMPTY_DETAIL;
  }
});

const EMPTY_AGING: AgingReport = { buckets: { current: "0.00", days1to30: "0.00", days31to60: "0.00", over60: "0.00" }, contacts: [] };

export const getReceivablesAging = cache(async (businessId: string): Promise<AgingReport> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return EMPTY_AGING;

  try {
    const response = await axios.get<AgingReport>(`${API_BASE_URL}/api/businesses/${businessId}/receivables/aging`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return EMPTY_AGING;
  }
});

export const getPayablesAging = cache(async (businessId: string): Promise<AgingReport> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return EMPTY_AGING;

  try {
    const response = await axios.get<AgingReport>(`${API_BASE_URL}/api/businesses/${businessId}/payables/aging`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return EMPTY_AGING;
  }
});

export const getReceivablesOverdue = cache(async (businessId: string): Promise<OverdueRow[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await axios.get<OverdueRow[]>(`${API_BASE_URL}/api/businesses/${businessId}/receivables/overdue`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return [];
  }
});

export const getPayablesOverdue = cache(async (businessId: string): Promise<OverdueRow[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await axios.get<OverdueRow[]>(`${API_BASE_URL}/api/businesses/${businessId}/payables/overdue`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return [];
  }
});

const EMPTY_LOAN_DASHBOARD: LoanDashboard = {
  totalDena: "0.00",
  totalPawna: "0.00",
  totalPaid: "0.00",
  totalReceived: "0.00",
  netBalance: "0.00",
  activeAccounts: 0,
  rows: [],
};

export const getLoanDashboard = cache(async (businessId: string): Promise<LoanDashboard> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return EMPTY_LOAN_DASHBOARD;

  try {
    const response = await axios.get<LoanDashboard>(`${API_BASE_URL}/api/businesses/${businessId}/loan-management/dashboard`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return EMPTY_LOAN_DASHBOARD;
  }
});

const EMPTY_LOAN_STATEMENT: LoanStatement = {
  contactId: "",
  contactName: "",
  openingBalance: "0.00",
  balanceBroughtForward: "0.00",
  rows: [],
  closingBalance: "0.00",
};

// For the Loan Management "Ledger" page -- only called once a Bank/Person
// has actually been picked (the page's own "Generate" step), not on every
// visit like other list pages' filters.
export const getLoanStatement = cache(
  async (businessId: string, contactId: string, filters: { dateFrom?: string; dateTo?: string } = {}): Promise<LoanStatement> => {
    const accessToken = await getAccessToken();
    if (!accessToken) return EMPTY_LOAN_STATEMENT;

    try {
      const response = await axios.get<LoanStatement>(`${API_BASE_URL}/api/businesses/${businessId}/contacts/${contactId}/loan-statement`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: filters,
      });
      return response.data;
    } catch {
      return EMPTY_LOAN_STATEMENT;
    }
  },
);
