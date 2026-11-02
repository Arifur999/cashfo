import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { ProfileCard } from "@/components/modules/Customer/Settings/ProfileCard";
import Button from "@/components/smartly/Button";
import Logo from "@/components/smartly/Logo";
import { REGISTER_ROUTE } from "@/lib/authUtils";
import { BRAND_NAME } from "@/lib/brand";
import { formatDate } from "@/lib/customer/date";
import { getPublicProfileCard, type PublicProfileCard } from "@/lib/customer/profileCard";
import { getTranslator } from "@/lib/i18n/locale";
import type { Translate } from "@/lib/i18n/message";

// This site's own address, for the absolute link social apps need to the
// card's picture (the request's host, behind the proxy's forwarded proto).
async function siteOrigin(): Promise<URL> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return new URL(`${proto}://${host}`);
}

const inviteText = (card: PublicProfileCard, t: Translate) =>
  card.friendDiscountPct > 0
    ? t("{name} keeps their money in order with Smartly. Join with their invite and get {percent}% off your first plan.", { name: card.name, percent: String(card.friendDiscountPct) })
    : t("{name} keeps their money in order with Smartly. Join with their invite, it's free to start.", { name: card.name });

export async function generateMetadata({ params }: PageProps<"/card/[code]">): Promise<Metadata> {
  const { code } = await params;
  const [card, { t }, metadataBase] = await Promise.all([getPublicProfileCard(code), getTranslator(), siteOrigin()]);
  if (!card) return { title: BRAND_NAME, robots: { index: false } };
  const title = t("{name} on Smartly", { name: card.name });
  const description = inviteText(card, t);
  // The picture itself comes from opengraph-image.tsx beside this page.
  return { metadataBase, title, description, robots: { index: false }, openGraph: { title, description, type: "profile" }, twitter: { card: "summary_large_image", title, description } };
}

// A shared profile card (Settings › Profile › Share profile card), open to
// anyone: the person's cover, photo and name, and an invite that signs a
// friend up with their referral code. A card that isn't shared shows no one.
export default async function ProfileCardPage({ params }: PageProps<"/card/[code]">) {
  const { code } = await params;
  const [card, { t, locale }] = await Promise.all([getPublicProfileCard(code), getTranslator()]);

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 bg-page px-4 py-10">
      <Link href="/" aria-label={BRAND_NAME}>
        <Logo height={34} alt={BRAND_NAME} className="dark:hidden" />
        <Logo height={34} alt={BRAND_NAME} onDark className="hidden dark:block" />
      </Link>
      {card ? (
        <ProfileCard
          name={card.name}
          avatarUrl={card.avatarUrl}
          coverUrl={card.coverUrl}
          since={t("With Smartly since {date}", { date: formatDate(card.memberSince, "MMMM yyyy", locale) })}
          invite={inviteText(card, t)}
          footer={
            <Button asChild size="xl" className="mt-1 w-full">
              <Link href={`${REGISTER_ROUTE}?ref=${encodeURIComponent(card.code)}`}>{t("Join Smartly")}</Link>
            </Button>
          }
        />
      ) : (
        <section className="flex w-full max-w-110 flex-col items-center gap-3 rounded-[22px] border border-line-card bg-surface px-6 py-10 text-center shadow-card">
          <h1 className="text-h3 font-semibold text-ink">{t("This profile card isn't shared")}</h1>
          <p className="text-body text-ink-muted">{t("Its owner may have turned it off.")}</p>
          <Button asChild variant="secondary" className="mt-2">
            <Link href="/">{t("Go to Smartly")}</Link>
          </Button>
        </section>
      )}
    </main>
  );
}
