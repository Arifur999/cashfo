import type { UserBusiness } from "@/lib/customer/api";

// "Personal", "Business" or "Group": how the shell names the open
// workspace, as an English key for t().
export function workspaceKind(business: UserBusiness | undefined): string {
  switch (business?.type) {
    case "BUSINESS":
      return "Business";
    case "GROUP":
      return "Group";
    default:
      return "Personal";
  }
}
