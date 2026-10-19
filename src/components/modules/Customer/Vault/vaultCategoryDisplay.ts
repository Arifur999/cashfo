import { Briefcase, FileText, KeyRound, Landmark, Mail, ShoppingCart, Smartphone, Users, Wifi, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/smartly/tones";
import type { VaultEntryCategory } from "@/lib/customer/api";

// The categories in the order the page lists them.
export const VAULT_CATEGORIES: VaultEntryCategory[] = ["SOCIAL", "EMAIL", "BANK", "MOBILE_BANKING", "SHOPPING", "WORK", "WIFI", "GOVERNMENT", "OTHER"];

// English, passed through t().
export const VAULT_CATEGORY_LABELS: Record<VaultEntryCategory, string> = {
  SOCIAL: "Social",
  BANK: "Bank",
  MOBILE_BANKING: "Mobile banking",
  EMAIL: "Email",
  SHOPPING: "Shopping",
  WORK: "Work",
  WIFI: "Wi-Fi",
  GOVERNMENT: "Government",
  OTHER: "Other",
};

export const VAULT_CATEGORY_ICONS: Record<VaultEntryCategory, LucideIcon> = {
  SOCIAL: Users,
  BANK: Landmark,
  MOBILE_BANKING: Smartphone,
  EMAIL: Mail,
  SHOPPING: ShoppingCart,
  WORK: Briefcase,
  WIFI: Wifi,
  GOVERNMENT: FileText,
  OTHER: KeyRound,
};

// The soft wash and ink each category's avatar takes.
export const VAULT_CATEGORY_TONE: Record<VaultEntryCategory, Tone> = {
  SOCIAL: "habits",
  EMAIL: "expense",
  BANK: "info",
  MOBILE_BANKING: "rose",
  SHOPPING: "loans",
  WORK: "vault",
  WIFI: "insights",
  GOVERNMENT: "income",
  OTHER: "neutral",
};

// The same colours as a Chip knows them ("vault" is the info blue there).
export const VAULT_CATEGORY_CHIP: Record<VaultEntryCategory, "habits" | "expense" | "info" | "rose" | "loans" | "insights" | "income" | "neutral"> = {
  SOCIAL: "habits",
  EMAIL: "expense",
  BANK: "info",
  MOBILE_BANKING: "rose",
  SHOPPING: "loans",
  WORK: "info",
  WIFI: "insights",
  GOVERNMENT: "income",
  OTHER: "neutral",
};
