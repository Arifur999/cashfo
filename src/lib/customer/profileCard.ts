// Server-only reader for a shared profile card (/card/<code>): no sign-in,
// the API answers only a card its owner shares, and never their email,
// phone or address.
import { cache } from "react";
import { API_BASE_URL } from "./api";

export interface PublicProfileCard {
  code: string;
  name: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  memberSince: string;
  // The friend's discount the invite mentions (0 while the program is off).
  friendDiscountPct: number;
}

// Null when the card isn't shared (or the API can't be reached): the page
// then says so instead of showing anyone.
export const getPublicProfileCard = cache(async (code: string): Promise<PublicProfileCard | null> => {
  if (!/^[A-Za-z0-9]{4,16}$/.test(code)) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/profile-card/public/${encodeURIComponent(code)}`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as PublicProfileCard) : null;
  } catch {
    return null;
  }
});

// The name as the card's picture writes it: the picture's font has no
// Bangla, so a name in Bangla is left to the page itself.
export const latinName = (name: string): string | null => (/^[\x20-\x7E]+$/.test(name.trim()) ? name.trim() : null);
