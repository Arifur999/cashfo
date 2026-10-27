import { Landmark, Users } from "lucide-react";
import { createElement } from "react";
import type { ContactType } from "@/lib/customer/api";
import { contactInitials } from "@/lib/customer/contactDisplay";
import { avatarTone } from "@/lib/customer/loanDisplay";
import { cn } from "@/lib/utils";

const SIZES = {
  22: "size-5.5 text-caption",
  24: "size-6 text-caption",
  26: "size-6.5 text-caption",
  28: "size-7 text-caption",
  30: "size-7.5 text-caption",
  32: "size-8 text-caption",
  34: "size-8.5 text-caption",
  36: "size-9 text-small",
  40: "size-10 text-small",
  44: "size-11 text-body-lg",
  56: "size-14 text-h3",
} as const;

// A bank or an NGO without a photo shows what it is, as the boards draw it:
// on a rounded square (12px corners at 44px, 8px at 30px), not a circle.
const KIND_TILE: Partial<Record<ContactType, { icon: typeof Landmark; tone: string }>> = {
  BANK: { icon: Landmark, tone: "bg-info-soft text-info" },
  NGO: { icon: Users, tone: "bg-pillar-insights-soft text-pillar-insights" },
};

interface PersonAvatarProps {
  name: string;
  src?: string | null;
  // A loan contact's kind.
  kind?: ContactType;
  size?: keyof typeof SIZES;
  // Phone lists colour each person; desktop tables keep them neutral.
  coloured?: boolean;
  className?: string;
}

// A person's photo, or their initials on a round tile: a loan contact, a
// group member.
export function PersonAvatar({ name, src, kind, size = 36, coloured = false, className }: PersonAvatarProps) {
  if (src) {
    // A backend-served upload, so a plain <img>.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("shrink-0 rounded-full object-cover", SIZES[size], className)} />;
  }
  const tile = kind ? KIND_TILE[kind] : undefined;
  if (tile) {
    return (
      <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center rounded-[27%] [&_svg]:size-1/2", SIZES[size], tile.tone, className)}>
        {createElement(tile.icon, { strokeWidth: 2 })}
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold", SIZES[size], coloured ? avatarTone(name) : "bg-surface-sunken text-ink-2", className)}>
      {contactInitials(name)}
    </span>
  );
}
