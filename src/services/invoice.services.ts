"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IInvoiceDetail, IInvoiceListItem } from "@/types/invoice.types";

export const getInvoices = async (queryString: string) => httpClient.getPaginated<IInvoiceListItem>(`/admin/invoices?${queryString}`);

export const getInvoiceById = async (id: string) => httpClient.get<IInvoiceDetail>(`/admin/invoices/${id}`);

// Sends the invoice, PDF attached, to the customer who paid (again).
export const emailInvoice = async (id: string) => httpClient.post<{ success: boolean; sentTo: string; emailedAt: string }>(`/admin/invoices/${id}/email`);
