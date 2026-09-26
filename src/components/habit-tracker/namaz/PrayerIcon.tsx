import { CloudSun, Moon, Sun, Sunrise, Sunset } from "lucide-react";

// Tinted square behind each prayer's icon (full literal classes, and
// translucent so it works in dark mode too).
const BADGES: Record<string, string> = {
  Fajr: "bg-sky-500/10 text-sky-600",
  Dhuhr: "bg-amber-500/10 text-amber-600",
  Asr: "bg-orange-500/10 text-orange-600",
  Maghrib: "bg-rose-500/10 text-rose-600",
  Isha: "bg-indigo-500/10 text-indigo-600",
};

export function prayerBadge(item: string): string {
  return Object.hasOwn(BADGES, item) ? BADGES[item] : "bg-blue-500/10 text-blue-600";
}

// The sky at each prayer's time: sunrise, midday sun, afternoon, sunset, night.
export function PrayerIcon({ item, className }: { item: string; className?: string }) {
  switch (item) {
    case "Fajr":
      return <Sunrise className={className} />;
    case "Dhuhr":
      return <Sun className={className} />;
    case "Asr":
      return <CloudSun className={className} />;
    case "Maghrib":
      return <Sunset className={className} />;
    default:
      return <Moon className={className} />;
  }
}
