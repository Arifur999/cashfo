import { HandCoins, Landmark, PieChart, Receipt, TrendingUp, type LucideIcon } from "lucide-react";
import type { AccountType } from "@/lib/customer/api";

// The icon on each group's header row in the chart of accounts.
export const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  ASSET: Landmark,
  LIABILITY: HandCoins,
  EQUITY: PieChart,
  INCOME: TrendingUp,
  EXPENSE: Receipt,
};
