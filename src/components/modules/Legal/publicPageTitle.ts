import "server-only";
import type { Metadata } from "next";
import { getTranslator } from "@/lib/i18n/locale";

// The tab title of a page anyone can open (sign-in, the legal pages,
// maintenance, not found) in the reader's language, with the admin-edited
// Bangla; the root layout adds "| Smartly":
//   export const generateMetadata = publicPageTitle("Sign in");
export const publicPageTitle = (title: string) => async (): Promise<Metadata> => {
  const { t } = await getTranslator();
  return { title: t(title) };
};
