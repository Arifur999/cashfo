import { redirect } from "next/navigation";

// An old address: income categories are on the Category Set page now.
export default function IncomePlanningPage() {
  redirect("/category-set");
}
