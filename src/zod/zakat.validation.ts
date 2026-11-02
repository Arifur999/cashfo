import { z } from "zod";
import type { IUpdateZakatPricesPayload } from "@/types/zakat.types";

// The backend's limits: whole taka per vori, gold from ৳ 1,000 and silver
// from ৳ 100 (a missing digit is caught), both under ৳ 1 crore.
const GOLD_MIN = 1000;
const SILVER_MIN = 100;
const PRICE_MAX = 10_000_000;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// A. Form schema -- the values as the card's inputs hold them.
const priceText = (min: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, "Whole taka only, like 217592")
    .refine((value) => Number(value) >= min && Number(value) <= PRICE_MAX, message);

export const zakatPricesFormZodSchema = z.object({
  gold22: priceText(GOLD_MIN, "Gold looks too low. Check the price per vori."),
  silver22: priceText(SILVER_MIN, "Silver looks too low. Check the price per vori."),
  on: z.string().regex(DAY, "Pick the day of these prices"),
});
export type IZakatPricesFormValues = z.infer<typeof zakatPricesFormZodSchema>;

// B. Server schema -- coerced to the API's numbers and re-validated in the action.
export const updateZakatPricesServerZodSchema = z
  .object({
    gold22: z.coerce.number().int().min(GOLD_MIN).max(PRICE_MAX),
    silver22: z.coerce.number().int().min(SILVER_MIN).max(PRICE_MAX),
    on: z.string().regex(DAY),
  })
  .strict() satisfies z.ZodType<IUpdateZakatPricesPayload>;
