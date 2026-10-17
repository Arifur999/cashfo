import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BackLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

// The way back up from a detail page: "All accounts", "All customers and suppliers".
export function BackLink({ href, children, className }: BackLinkProps) {
  return (
    <Link href={href} className={cn("inline-flex w-fit items-center gap-2 text-small font-semibold text-emerald hover:underline print:hidden", className)}>
      <ArrowLeft className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}
