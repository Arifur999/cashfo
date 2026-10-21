"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { listUrlKey, restoredListUrl, savedListUrl } from "@/components/modules/Customer/Layout/topbarCrumbs";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import type { NavLeaf } from "@/lib/customer/nav";

const TRANSACTIONS: NavLeaf = { label: "Transactions", href: "/transactions" };

const subscribeNowhere = () => () => {};

const readSaved = (): string | null => {
  try {
    return window.sessionStorage.getItem(listUrlKey(TRANSACTIONS));
  } catch {
    return null;
  }
};

// A transaction's way back to the list as it was left (its filters and
// page), from the address the top bar saved in this workspace, the way the
// bar's own crumb goes back. The server (and hydration) link the plain
// list, and so does a tab that saved nothing.
export function BackToTransactions({ label }: { label: string }) {
  const { activeBusinessId } = useAuth();
  const stored = useSyncExternalStore(subscribeNowhere, readSaved, () => null);
  const href = restoredListUrl(TRANSACTIONS, savedListUrl(stored, activeBusinessId));
  return (
    <Link href={href} className="mb-1 inline-flex items-center gap-2 self-start text-small font-semibold text-emerald hover:text-emerald-hover">
      <ArrowLeft className="size-[15px]" aria-hidden="true" />
      {label}
    </Link>
  );
}
