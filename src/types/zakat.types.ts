// Admin > Settings > Zakat prices: the BAJUS prices per vori (22 karat)
// every member's zakat starts from.
export interface IZakatPrices {
  gold22: number;
  silver22: number;
  // The day the prices are from, "2026-10-31".
  on: string;
  updatedAt: string | null;
  // The admin who entered them, by id.
  updatedBy: string | null;
}

export interface IUpdateZakatPricesPayload {
  gold22: number;
  silver22: number;
  on: string;
}
