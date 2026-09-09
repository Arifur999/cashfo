import type { FeatureUsageEntry } from "@/lib/api";
import { HorizontalBarList } from "./HorizontalBarList";

const LABELS: Record<string, string> = {
  expense_added: "Expense Added",
  income_added: "Income Added",
  login: "Login",
  report_viewed: "Report Viewed",
  budget_created: "Budget Created",
  workspace_created: "Workspace Created",
  account_created: "Account Created",
};

function labelFor(eventType: string): string {
  return LABELS[eventType] ?? eventType.replaceAll("_", " ");
}

export function FeatureUsageChart({ data }: { data: FeatureUsageEntry[] }) {
  const items = data.map((d) => ({ label: labelFor(d.eventType), value: d.count }));
  return <HorizontalBarList items={items} />;
}
