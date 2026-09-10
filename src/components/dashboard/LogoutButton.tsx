"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button
      type="button"
      onClick={logout}
      className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
    >
      <LogOut className="h-4 w-4" /> Sign Out
    </button>
  );
}
