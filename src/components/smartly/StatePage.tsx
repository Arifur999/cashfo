import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
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
  className?: string;
}

// The frame for a page that is a message: something went wrong, not found,
// maintenance. Centred, with the 72px tile, the mono reference line, the
// display title and up to two buttons.
const StatePage = ({ icon, tone, reference, title, description, actions, children, standalone = true, className }: StatePageProps) => (
  <div className={cn("flex min-h-full flex-1 flex-col", standalone ? "min-h-screen bg-fresh px-6 py-6 md:px-12 md:py-8" : "px-4 py-8", className)}>
    {standalone && (
      <Link href="/" aria-label={`${BRAND_NAME} home`} className="self-start rounded-md">
        <Logo height={40} alt="" />
      </Link>
    )}
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-12 text-center">
      <IconTile tone={tone} size={72}>
        {icon}
      </IconTile>
      {reference && <span className="font-mono text-code text-ink-muted">{reference}</span>}
      <h1 className="max-w-2xl text-h1 text-ink md:text-display">{title}</h1>
      <p className="max-w-xl text-body-lg text-ink-2">{description}</p>
      {actions && <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
      {children}
    </div>
  </div>
);

export default StatePage;
