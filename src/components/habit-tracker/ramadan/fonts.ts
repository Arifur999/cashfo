import { Aref_Ruqaa } from "next/font/google";

// Calligraphic Arabic face for the "رمضان كريم" title only. Kept in this
// module (not layout.tsx) so the font is only requested by pages that
// actually import the Ramadan components.
export const arefRuqaa = Aref_Ruqaa({ subsets: ["arabic"], weight: ["400", "700"], display: "swap" });
