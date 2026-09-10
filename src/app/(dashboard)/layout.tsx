import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { getCurrentUser } from "@/lib/auth";

// The ONE place that gates every page under (dashboard) -- proxy.ts already
// redirects unauthenticated requests before they get here, but this is a
// defense-in-depth check for the Server Component tree itself (and it's
// what actually fetches the user data AuthProvider needs). Every future
// page in this route group is automatically protected and gets useAuth()
// for free just by living under (dashboard) -- no per-page boilerplate.
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <AuthProvider initialUser={user}>{children}</AuthProvider>;
}
