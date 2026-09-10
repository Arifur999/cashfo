import { Settings2 } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";

// Page navigation (Dashboard, Accounts, ...) lives in Sidebar.tsx now --
// this bar is just cross-cutting utilities that make sense next to the
// user's identity, same split as admin-frontend's Sidebar+TopBar.
export function TopBar() {
  return (
    <header className="flex h-16 items-center justify-end gap-3 border-b border-neutral-100 bg-white px-6">
      <Link
        href="/settings/workspaces"
        title="Manage workspaces"
        className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100"
      >
        <Settings2 className="h-4 w-4" />
      </Link>
      <WorkspaceSwitcher />
      <LogoutButton />
    </header>
  );
}
