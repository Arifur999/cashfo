import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";

// The ONE place that gates every page under (dashboard) -- proxy.ts already
// redirects unauthenticated requests before they get here, but this is a
// defense-in-depth check for the Server Component tree itself (and it's
// what actually fetches the user data AuthProvider needs). Every future
// page in this route group is automatically protected and gets useAuth()
// for free just by living under (dashboard) -- no per-page boilerplate.
//
// Sidebar (left nav) + TopBar (utility bar) composition mirrors
// admin-frontend's own (dashboard)/layout.tsx exactly.
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);

  return (
    <AuthProvider initialUser={user} initialActiveBusinessId={activeBusinessId}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          {/* The only scrollable region -- Sidebar and TopBar stay fixed in
              place while a page's own content (a long table, a tall form,
              etc.) scrolls internally instead of the whole window. */}
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
