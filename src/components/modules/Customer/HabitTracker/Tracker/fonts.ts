import { Aref_Ruqaa } from "next/font/google";

// Calligraphic Arabic face for the hero titles ("رمضان كريم", "الصلاة") only.
// Kept here (not layout.tsx) so the font is only requested by the pages that
// actually import the Ramadan/Namaz tracker components.
export const arefRuqaa = Aref_Ruqaa({ subsets: ["arabic"], weight: ["400", "700"], display: "swap" });
