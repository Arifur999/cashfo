import { ArrowRight } from "lucide-react";
import Link from "next/link";
import ByWidth from "@/components/smartly/ByWidth";

// A Home section header's link, 44px tall on phones for the thumb. Phones
// show the short wording ("Open"), so the link is named by the wide one
// ("Open loans"): two "Open" links would read alike in a screen reader's
// list of links.
export function SectionLink({ href, phone, wide, arrow = false }: { href: string; phone: string; wide: string; arrow?: boolean }) {
  return (
    <Link href={href} aria-label={wide} className="flex min-h-11 items-center gap-1 text-body font-semibold text-emerald hover:text-emerald-hover md:min-h-0">
      <ByWidth phone={phone} wide={wide} />
      {arrow && <ArrowRight className="hidden size-4 md:block" aria-hidden="true" />}
    </Link>
  );
}
