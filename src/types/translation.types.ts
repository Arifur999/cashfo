export const TRANSLATION_LANGUAGES = ["en", "bn"] as const;
export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

export interface ITranslation {
  id: string;
  // Dotted path the app looks strings up by, e.g. "dashboard.total_income".
  key: string;
  en: string;
  bn: string;
  // Grouping for the admin UI: "dashboard", "auth", "reports", ...
  context: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface ICreateTranslationPayload {
  key: string;
  en: string;
  bn: string;
  context?: string;
}

export type IUpdateTranslationPayload = Partial<Record<TranslationLanguage, string>>;

// The app's string bundles: each key path expanded into nested objects.
export type ITranslationBundles = Record<TranslationLanguage, Record<string, unknown>>;
