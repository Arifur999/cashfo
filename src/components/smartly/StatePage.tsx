import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import type { Locale } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import IconTile from "./IconTile";
import Logo from "./Logo";
import type { Tone } from "./tones";

interface StatePageProps {
  icon: React.ReactNode;
  tone: Tone;
  // The small monospace line above the title: an error reference, "404",
  // the maintenance window.
  reference?: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  actions?: React.ReactNode;
  // Under the buttons, or anything else the page wants to add.
  children?: React.ReactNode;
  // Full page (with the logo, on the fresh wash) or inside an app shell.
  standalone?: boolean;
  // Standalone only: the page is its own <main>, the skip link's
  // #main-content target, as a page outside every shell has no other.
  main?: boolean;
  // The page's language, set on it with its face (a page no LocaleProvider
  // wraps has neither). In Bangla the title gets normal tracking and a 1.3
  // line: the display style's tight Latin ones squeeze the clusters.
  locale?: Locale;
  // The logo link's name, already translated ("{brand} home").
  homeLabel?: string;
  className?: string;
}

// The frame for a page that is a message: something went wrong, not found,
// maintenance. Centred, with the 72px tile, the mono reference line, the
// display title and up to two buttons. Standalone it fills the window; inside
// the app it centres in the content area's first 620px, a little tighter.
const StatePage = ({ icon, tone, reference, title, description, actions, children, standalone = true, main = false, locale, homeLabel, className }: StatePageProps) => {
  const landmark = standalone && main;
  const Root = landmark ? "main" : "div";
  return (
    <Root
      id={landmark ? "main-content" : undefined}
      tabIndex={landmark ? -1 : undefined}
      lang={locale}
      className={cn(
        "flex min-h-full flex-1 flex-col",
        standalone ? "min-h-screen bg-fresh px-6 py-6 md:px-12 md:py-8" : "px-4 py-8 md:p-8",
        landmark && "outline-none",
        locale === "bn" && "font-bn",
        className,
      )}
    >
      {standalone && (
        <Link href="/" aria-label={homeLabel ?? `${BRAND_NAME} home`} className="self-start rounded-md">
          <Logo height={40} alt="" />
        </Link>
      )}
      <div className={cn("flex flex-col items-center justify-center text-center", standalone ? "flex-1 gap-5 py-12" : "min-h-155 gap-4")}>
        <IconTile tone={tone} size={72}>
          {icon}
        </IconTile>
        {reference && <span className="font-mono text-code text-ink-muted">{reference}</span>}
        <h1 className={cn("max-w-160 text-h1 text-ink md:text-display", locale === "bn" && "tracking-normal leading-[1.3]")}>{title}</h1>
        <p className={cn("text-body-lg leading-[25px] text-ink-2", standalone ? "max-w-140" : "max-w-130")}>{description}</p>
        {actions && <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
        {children}
      </div>
    </Root>
  );
};

export default StatePage;
