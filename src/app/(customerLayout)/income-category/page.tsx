import { redirect } from "next/navigation";

// Income Category became the Category Set page (both kinds of category).
export default function IncomeCategoryPage() {
  redirect("/category-set");
}
