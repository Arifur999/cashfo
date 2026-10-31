import { redirect } from "next/navigation";

// Savings overview is part of Savings accounts now: its money summary sits
// at the top of that page. Old links and bookmarks land there.
export default function SavingsOverviewPage() {
  redirect("/savings-goals/wallet");
}
