"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { refundPayment, retryPayment } from "@/services/payment.services";
import { refundServerZodSchema } from "@/zod/payment.validation";

export const refundPaymentAction = async (paymentId: string, values: unknown) =>
  requireId(paymentId, "payment") ??
  runValidatedAction(refundServerZodSchema, values, "Failed to refund payment", (payload) => refundPayment(paymentId, payload));

export const retryPaymentAction = async (paymentId: string) =>
  requireId(paymentId, "payment") ?? runAction("Failed to retry payment", () => retryPayment(paymentId));
