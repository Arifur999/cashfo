import { describe, expect, it } from "vitest";
import { getSignInErrorMessage } from "@/lib/signInErrors";
import { PASSWORD_STRENGTH_LABELS } from "@/lib/passwordStrength";
import { bnDictionary } from "./dictionary";

// The auth pages show these English strings through translate(); a missing
// key would leave English in the middle of a Bangla page.
describe("bnDictionary", () => {
  it("covers every Google sign-in error the login page can show", () => {
    for (const code of ["suspended", "account_not_linked", "access_denied", "email_not_found", "signup_disabled", "anything-else"]) {
      const message = getSignInErrorMessage(code);
      expect(message && bnDictionary[message], `${code}: ${message}`).toBeTruthy();
    }
  });

  it("covers every password strength label", () => {
    for (const label of Object.values(PASSWORD_STRENGTH_LABELS)) {
      expect(bnDictionary[label], label).toBeTruthy();
    }
  });

  // A Bangla sentence that lost {count} would show the wrong figure, or none.
  it("keeps every {placeholder} of the English in its Bangla", () => {
    const placeholders = (text: string) => [...text.matchAll(/(?<!\{)\{(\w+)\}(?!\})/g)].map((match) => match[1]).sort();
    for (const [english, bangla] of Object.entries(bnDictionary)) {
      expect(placeholders(bangla), english).toEqual(placeholders(english));
    }
  });
});
