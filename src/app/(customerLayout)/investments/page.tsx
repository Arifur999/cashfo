import { redirect } from "next/navigation";

// The section opens on its Dashboard.
export default function InvestmentsPage() {
  redirect("/investments/dashboard");
}
