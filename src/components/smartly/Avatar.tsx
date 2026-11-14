import { getInitials } from "@/lib/text";
import { cn } from "@/lib/utils";

const SIZES = {
  32: "size-8 text-caption",
  // The top bar's account button (design-v4).
  38: "size-9.5 text-small",
  36: "size-9 text-small",
  44: "size-11 text-body-lg",
  // Settings: the phone menu's card, the profile, the photo dialog's preview.
  48: "size-12 text-body-lg",
  // Settings › Profile (v16): the side card's and the photo row's.
  52: "size-13 text-body-lg",
  64: "size-16 text-h3",
  72: "size-18 text-h2",
  // The shareable profile card, over the edge of its cover.
  88: "size-22 text-h1",
  120: "size-30 text-display",
} as const;

const TONES = {
  // Forest with mint lettering: the customer's own avatar in the top bar.
  forest: "bg-forest text-mint-200 font-bold",
  // Mint glow with forest lettering: the admin's, in the Night sidebar.
  glow: "bg-mint-glow text-forest font-extrabold",
  // The primary's tint with its own colour: design-v4's avatars (the sidebar's
  // profile row, the top bar's account button), teal in the Habit Tracker.
  soft: "bg-mint-50 text-emerald font-bold",
  // The primary run darker on a slant with white initials: Settings › Profile's
  // photo-less avatar (SettingsProfile board).
  brand: "bg-linear-135 from-emerald to-brand-shade text-white font-bold",
  // Mint on the Night drawer.
  mint: "bg-mint-200 text-forest font-bold",
} as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
  // The photo's text, the name by default; "" when the name is written
  // beside it, so it isn't read out twice.
  alt?: string;
  className?: string;
}

// A person's photo, or their initials on a brand circle.
const Avatar = ({ name, src, size = 36, tone = "forest", alt, className }: AvatarProps) => {
  if (src) {
    // A backend-served upload, so a plain <img> (next/image would need the
    // API host allow-listed for a 36px picture).
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt ?? name} className={cn("shrink-0 rounded-full object-cover", SIZES[size], className)} />;
  }
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center rounded-full", SIZES[size], TONES[tone], className)}>
      {getInitials(name) || "?"}
    </span>
  );
};

export default Avatar;
