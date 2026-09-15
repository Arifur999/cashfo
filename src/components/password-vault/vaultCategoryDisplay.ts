import { Briefcase, Landmark, Mail, ShoppingCart, Users, KeyRound, type LucideIcon } from "lucide-react";
import type { VaultEntryCategory } from "@/lib/api";

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
