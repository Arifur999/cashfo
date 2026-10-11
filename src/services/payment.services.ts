"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IPayment, IPaymentDetail, IRefundPayload } from "@/types/payment.types";

// `failed` is its own endpoint (it also returns failureReason first-class).
export const getPayments = async (queryString: string, view: "all" | "failed" = "all") =>
  httpClient.getPaginated<IPayment>(`/admin/payments${view === "failed" ? "/failed" : ""}?${queryString}`);

export const getPaymentById = async (id: string) => httpClient.get<IPaymentDetail>(`/admin/payments/${id}`);

export const refundPayment = async (id: string, payload: IRefundPayload) => httpClient.post<void>(`/admin/payments/${id}/refund`, payload);

export const retryPayment = async (id: string) => httpClient.post<void>(`/admin/payments/${id}/retry`);
