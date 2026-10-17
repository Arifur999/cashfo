// The design's five tints for a person's initials in a list: mint, blue,
// amber, violet and rose. A person keeps theirs on every page, because it
// comes from a hash of something stable about them (their email, else
// their name).
export const AVATAR_TONES = [
  "bg-mint-50 text-brand-ink",
  "bg-info-soft text-info",
  "bg-warning-soft text-warning",
  "bg-pillar-habits-soft text-pillar-habits",
  "bg-rose-soft text-rose",
] as const;

export const avatarTone = (key: string) => {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
};
