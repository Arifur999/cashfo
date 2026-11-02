"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IUpdateZakatPricesPayload, IZakatPrices } from "@/types/zakat.types";

export const getZakatPrices = async () => httpClient.get<IZakatPrices>("/admin/zakat/prices");

export const updateZakatPrices = async (payload: IUpdateZakatPricesPayload) => httpClient.patch<IZakatPrices>("/admin/zakat/prices", payload);
