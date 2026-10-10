"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IInvoiceDetail, IInvoiceListItem } from "@/types/invoice.types";

export const getInvoices = async (queryString: string) => httpClient.getPaginated<IInvoiceListItem>(`/admin/invoices?${queryString}`);

export const getInvoiceById = async (id: string) => httpClient.get<IInvoiceDetail>(`/admin/invoices/${id}`);
