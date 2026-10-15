import { Briefcase, KeyRound, Landmark, Mail, ShoppingCart, Users, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/smartly/tones";
import type { VaultEntryCategory } from "@/lib/customer/api";

// The categories in the order the page lists them.
export const VAULT_CATEGORIES: VaultEntryCategory[] = ["SOCIAL", "EMAIL", "BANK", "SHOPPING", "WORK", "OTHER"];

// English, passed through t().
export const VAULT_CATEGORY_LABELS: Record<VaultEntryCategory, string> = {
  SOCIAL: "Social",
  BANK: "Bank",
  EMAIL: "Email",
  SHOPPING: "Shopping",
  WORK: "Work",
  OTHER: "Other",
};

export const VAULT_CATEGORY_ICONS: Record<VaultEntryCategory, LucideIcon> = {
  SOCIAL: Users,
  BANK: Landmark,
  EMAIL: Mail,
  SHOPPING: ShoppingCart,
  WORK: Briefcase,
  OTHER: KeyRound,
};

// The soft wash and ink each category's avatar takes.
export const VAULT_CATEGORY_TONE: Record<VaultEntryCategory, Tone> = {
  SOCIAL: "habits",
  EMAIL: "expense",
  BANK: "info",
  SHOPPING: "loans",
  WORK: "vault",
  OTHER: "neutral",
};

// The same colours as a Chip knows them ("vault" is the info blue there).
export const VAULT_CATEGORY_CHIP: Record<VaultEntryCategory, "habits" | "expense" | "info" | "loans" | "neutral"> = {
  SOCIAL: "habits",
  EMAIL: "expense",
  BANK: "info",
  SHOPPING: "loans",
  WORK: "info",
  OTHER: "neutral",
};
