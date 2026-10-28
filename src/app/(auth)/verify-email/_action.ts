"use server";

import { type AuthRefusal, toAuthRefusal } from "@/lib/authRefusal";
import { confirmEmailVerification } from "@/services/accountAccess.services";

// "Confirm my email" on the emailed link's page. A button, not the link
// itself: mail scanners open links, and must not confirm an address.
export const confirmEmailAction = async (token: unknown): Promise<{ success: true; email: string } | AuthRefusal> => {
  if (typeof token !== "string" || !token.trim()) return { success: false, message: "This link is incomplete." };
  try {
    const { email } = await confirmEmailVerification(token.trim());
    return { success: true, email };
  } catch (error) {
    return toAuthRefusal(error, "We couldn't confirm your email. Please try again.");
  }
};
