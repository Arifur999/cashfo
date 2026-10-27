"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IMarkPaymentPaidPayload, IPayment, IPaymentDetail, IPaymentStats, IRefundPayload } from "@/types/payment.types";

// `failed` is its own endpoint (it also returns failureReason first-class).
export const getPayments = async (queryString: string, view: "all" | "failed" = "all") =>
  httpClient.getPaginated<IPayment>(`/admin/payments${view === "failed" ? "/failed" : ""}?${queryString}`);

export const getPaymentStats = async () => httpClient.get<IPaymentStats>("/admin/payments/stats");

export const getPaymentById = async (id: string) => httpClient.get<IPaymentDetail>(`/admin/payments/${id}`);

export const refundPayment = async (id: string, payload: IRefundPayload) => httpClient.post<void>(`/admin/payments/${id}/refund`, payload);

export const retryPayment = async (id: string) => httpClient.post<void>(`/admin/payments/${id}/retry`);

// A customer's checkout is confirmed by hand (no gateway is connected yet):
// the plan starts, with an invoice and a receipt.
export const markPaymentPaid = async (id: string, payload: IMarkPaymentPaidPayload) => httpClient.post<unknown>(`/admin/payments/${id}/mark-paid`, payload);

export const markPaymentFailed = async (id: string, reason: string) => httpClient.post<unknown>(`/admin/payments/${id}/mark-failed`, { reason });
