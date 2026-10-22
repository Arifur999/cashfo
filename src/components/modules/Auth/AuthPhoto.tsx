"use client";

import Image from "next/image";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { bnHeading } from "./bnType";

export type AuthPhotoVariant = "login" | "register" | "narrow";

// Each page's photo and its two lines (never more): a seedling in the sun
// for coming back, a seedling in open hands for starting out.
const PHOTOS: Record<AuthPhotoVariant, { src: string; title: string; line: string }> = {
  login: { src: "/brand/login.jpeg", title: "Track. Save. Grow.", line: "Welcome back to calm money." },
  register: { src: "/brand/register.jpeg", title: "Plant your first seed.", line: "Every taka you track grows into a plan." },
  narrow: { src: "/brand/login.jpeg", title: "Back in a moment.", line: "We'll get you into your account safely." },
};

// The card's picture side: the photo settles from a slight zoom and then
// breathes slowly, with its two lines rising in over a forest shade. A
// banner on phones, half the card from lg.
export function AuthPhoto({ variant }: { variant: AuthPhotoVariant }) {
  const { locale, t } = useLocale();
  const photo = PHOTOS[variant];

  return (
    <div className="relative m-2 h-40 overflow-hidden rounded-[20px] bg-forest sm:h-52 lg:m-3 lg:h-auto lg:min-h-130">
      <Image key={photo.src} src={photo.src} alt="" fill priority sizes="(min-width: 1024px) 560px, 100vw" className="auth-photo object-cover" />
      <div aria-hidden="true" className="auth-photo-shade absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 sm:gap-2 lg:p-10">
        <p key={`${variant}-title`} className={cn("auth-line text-h2 font-bold tracking-[-0.02em] text-white sm:text-h1 lg:text-display", bnHeading(locale))} style={{ animationDelay: "0.35s" }}>
          {t(photo.title)}
        </p>
        <p key={`${variant}-line`} className="auth-line text-small text-white/85 sm:text-body lg:text-body-lg" style={{ animationDelay: "0.5s" }}>
          {t(photo.line)}
        </p>
      </div>
    </div>
  );
}
