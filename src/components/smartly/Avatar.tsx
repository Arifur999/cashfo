import { getInitials } from "@/lib/text";
import { cn } from "@/lib/utils";

const SIZES = {
  32: "size-8 text-caption",
  36: "size-9 text-small",
  44: "size-11 text-body-lg",
} as const;

const TONES = {
  // Forest with mint lettering: the customer's own avatar in the top bar.
  forest: "bg-forest text-mint-200 font-bold",
  // Mint glow with forest lettering: the admin's, in the Night sidebar.
  glow: "bg-mint-glow text-forest font-extrabold",
  // Mint on the Night drawer.
  mint: "bg-mint-200 text-forest font-bold",
} as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
  className?: string;
}

// A person's photo, or their initials on a brand circle.
const Avatar = ({ name, src, size = 36, tone = "forest", className }: AvatarProps) => {
  if (src) {
    // A backend-served upload, so a plain <img> (next/image would need the
    // API host allow-listed for a 36px picture).
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cn("shrink-0 rounded-full object-cover", SIZES[size], className)} />;
  }
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center rounded-full", SIZES[size], TONES[tone], className)}>
      {getInitials(name) || "?"}
    </span>
  );
};

export default Avatar;
