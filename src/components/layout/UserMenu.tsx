"use client";

import { LogOut, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

// TopBar's user avatar + dropdown (replaces the old standalone "Sign Out"
// button) -- same self-contained outside-click-to-close pattern as
// GoalActionsMenu/AddCategoryButton. "Profile" and "Settings" both point at
// /settings for now (it only has a Profile tab so far); kept as two
// separate links, matching the reference layout, so adding more tabs later
// doesn't require touching this menu.
export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="block rounded-full">
        {user.avatarUrl ? (
          // Plain <img> for a backend-served upload, matching ContactDetailPageClient's own convention (avoids next/image needing the backend host allowlisted).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary">
            {initials(user.name)}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-neutral-100 bg-surface py-1 shadow-xl shadow-black/10">
          <div className="border-b border-neutral-100 px-3.5 py-2.5">
            <p className="truncate text-sm font-medium text-neutral-900">{user.name}</p>
            <p className="truncate text-xs text-neutral-400">{user.email}</p>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            <UserIcon className="h-3.5 w-3.5" /> Profile
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            <Settings className="h-3.5 w-3.5" /> Settings
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="flex w-full items-center gap-2 border-t border-neutral-100 px-3.5 py-2 text-left text-sm text-brand-danger hover:bg-neutral-50"
          >
            <LogOut className="h-3.5 w-3.5" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
