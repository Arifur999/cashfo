import { contactInitials } from "@/lib/customer/contactDisplay";
import { avatarTone } from "@/lib/customer/loanDisplay";
import { cn } from "@/lib/utils";

const SIZES = {
  22: "size-5.5 text-[11px]",
  24: "size-6 text-[11px]",
  26: "size-6.5 text-caption",
  28: "size-7 text-caption",
  30: "size-7.5 text-caption",
  32: "size-8 text-caption",
  34: "size-8.5 text-caption",
  36: "size-9 text-small",
  40: "size-10 text-small",
  44: "size-11 text-body-lg",
} as const;

interface PersonAvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  // Phone lists colour each person; desktop tables keep them neutral.
  coloured?: boolean;
  className?: string;
}

// A person's photo, or their initials on a round tile: a loan contact, a
// group member.
export function PersonAvatar({ name, src, size = 36, coloured = false, className }: PersonAvatarProps) {
  if (src) {
    // A backend-served upload, so a plain <img>.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("shrink-0 rounded-full object-cover", SIZES[size], className)} />;
  }
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold", SIZES[size], coloured ? avatarTone(name) : "bg-surface-sunken text-ink-2", className)}>
      {contactInitials(name)}
    </span>
  );
}
