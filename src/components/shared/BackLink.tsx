import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BackLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

// The way back up from an admin detail page: "All users", "All payments".
const BackLink = ({ href, children, className }: BackLinkProps) => (
  <Link href={href} className={cn("inline-flex w-fit items-center gap-2 text-body font-semibold text-ink-2 hover:text-ink", className)}>
    <ArrowLeft className="size-4" aria-hidden="true" />
    {children}
  </Link>
);

export default BackLink;
