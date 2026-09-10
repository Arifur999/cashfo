import { Settings2 } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";

export function TopBar() {
  return (
    <header className="flex items-center justify-between border-b border-neutral-100 bg-white px-6 py-3">
      <span className="text-lg font-semibold text-brand-dark">Money Tracker</span>
      <div className="flex items-center gap-3">
        <Link
          href="/settings/workspaces"
          title="Manage workspaces"
          className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100"
        >
          <Settings2 className="h-4 w-4" />
        </Link>
        <WorkspaceSwitcher />
        <LogoutButton />
      </div>
    </header>
  );
}
