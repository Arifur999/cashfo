"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { markPaymentFailed, markPaymentPaid, refundPayment, retryPayment } from "@/services/payment.services";
import { markPaymentFailedServerZodSchema, markPaymentPaidServerZodSchema, refundServerZodSchema } from "@/zod/payment.validation";

export const refundPaymentAction = async (paymentId: string, values: unknown) =>
  requireId(paymentId, "payment") ??
  runValidatedAction(refundServerZodSchema, values, "Failed to refund payment", (payload) => refundPayment(paymentId, payload));

export const retryPaymentAction = async (paymentId: string) =>
  requireId(paymentId, "payment") ?? runAction("Failed to retry payment", () => retryPayment(paymentId));

export const markPaymentPaidAction = async (paymentId: string, values: unknown) =>
  requireId(paymentId, "payment") ??
  runValidatedAction(markPaymentPaidServerZodSchema, values, "Failed to mark the payment paid", (payload) => markPaymentPaid(paymentId, payload));

export const markPaymentFailedAction = async (paymentId: string, values: unknown) =>
  requireId(paymentId, "payment") ??
  runValidatedAction(markPaymentFailedServerZodSchema, values, "Failed to mark the payment failed", ({ reason }) => markPaymentFailed(paymentId, reason));
