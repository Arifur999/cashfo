import Avatar from "@/components/smartly/Avatar";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  name: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  // "Member since October 2026", already in the reader's words.
  since: string;
  // The invite line under the name.
  invite: string;
  // Beside the invite: the referral code, or a call to action.
  footer?: React.ReactNode;
  className?: string;
}

// The cover over the profile when there is no photo for it.
export const COVER_FALLBACK = "bg-[linear-gradient(135deg,var(--color-emerald)_0%,var(--color-pillar-insights)_55%,var(--color-info)_100%)]";

// The shareable profile card: the cover, the photo over its edge, the name,
// how long they have been with Smartly and the invite. Never an email,
// phone or address. The same card in Settings (its preview) and on the
// public page.
export function ProfileCard({ name, avatarUrl, coverUrl, since, invite, footer, className }: ProfileCardProps) {
  return (
    <article className={cn("flex w-full max-w-110 flex-col overflow-hidden rounded-[22px] border border-line-card bg-surface shadow-card", className)}>
      <div className={cn("relative h-32 bg-cover bg-center", !coverUrl && COVER_FALLBACK)} style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}>
        <span className="absolute top-3 right-3 rounded-full bg-black/35 px-2.5 py-1 text-caption font-semibold text-white backdrop-blur-sm">Smartly</span>
      </div>
      <div className="flex flex-col gap-3 px-5 pb-5">
        <Avatar name={name} src={avatarUrl} size={88} alt="" className="relative z-10 -mt-11 ring-4 ring-surface" />
        <div className="flex flex-col gap-1">
          <h2 className="text-h3 font-semibold break-words text-ink">{name}</h2>
          <span className="text-small text-ink-muted">{since}</span>
        </div>
        <p className="text-body leading-normal text-ink-2">{invite}</p>
        {footer}
      </div>
    </article>
  );
}
