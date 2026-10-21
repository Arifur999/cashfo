import { CloudSun, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { SOFT_TONE } from "@/components/smartly/tones";

// Tinted square behind each prayer's icon: each prayer keeps a hue of its
// sky (dawn teal, midday amber, afternoon orange, sunset rose, night violet),
// taken from the design's soft tones so dark mode gets the matching pair.
const BADGES: Record<string, string> = {
  Fajr: SOFT_TONE.insights,
  Dhuhr: SOFT_TONE.warning,
  Asr: SOFT_TONE.loans,
  Maghrib: SOFT_TONE.rose,
  Isha: SOFT_TONE.habits,
};

export function prayerBadge(item: string): string {
  return Object.hasOwn(BADGES, item) ? BADGES[item] : SOFT_TONE.info;
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
