// Prayer, Sehri and Iftar times, worked out on the device from a person's
// prayer settings with adhan (the same inputs give the same times on the
// server and in the browser). Pure.
import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";
import { formatDate } from "@/lib/date";

export type AsrSchool = "HANAFI" | "SHAFII";

export interface PrayerSettings {
  city: string;
  latitude: number;
  longitude: number;
  // An adhan calculation method name.
  method: string;
  asrSchool: AsrSchool;
  // -1, 0 or 1: the Hijri date runs a day earlier or later than calculated.
  hijriAdjust: number;
}

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = { city: "Dhaka", latitude: 23.8103, longitude: 90.4125, method: "Karachi", asrSchool: "HANAFI", hijriAdjust: 0 };

// Bangladesh's divisional cities and a few large towns.
export const CITIES: { name: string; latitude: number; longitude: number }[] = [
  { name: "Dhaka", latitude: 23.8103, longitude: 90.4125 },
  { name: "Chattogram", latitude: 22.3569, longitude: 91.7832 },
  { name: "Khulna", latitude: 22.8456, longitude: 89.5403 },
  { name: "Rajshahi", latitude: 24.3745, longitude: 88.6042 },
  { name: "Sylhet", latitude: 24.8949, longitude: 91.8687 },
  { name: "Barishal", latitude: 22.701, longitude: 90.3535 },
  { name: "Rangpur", latitude: 25.7439, longitude: 89.2752 },
  { name: "Mymensingh", latitude: 24.7471, longitude: 90.4203 },
  { name: "Cumilla", latitude: 23.4607, longitude: 91.1809 },
  { name: "Gazipur", latitude: 23.9999, longitude: 90.4203 },
  { name: "Narayanganj", latitude: 23.6238, longitude: 90.5 },
  { name: "Bogura", latitude: 24.8481, longitude: 89.373 },
  { name: "Jashore", latitude: 23.1664, longitude: 89.2081 },
  { name: "Cox's Bazar", latitude: 21.4272, longitude: 92.0058 },
];

// The methods on offer, with the words the settings show. The first is the
// one most mosques in Bangladesh follow.
// short names the hero's "Karachi method".
export const METHODS: { key: keyof typeof CalculationMethod; label: string; short: string }[] = [
  { key: "Karachi", label: "University of Islamic Sciences, Karachi", short: "Karachi" },
  { key: "MuslimWorldLeague", label: "Muslim World League", short: "MWL" },
  { key: "Egyptian", label: "Egyptian General Authority of Survey", short: "Egyptian" },
  { key: "UmmAlQura", label: "Umm al-Qura, Makkah", short: "Umm al-Qura" },
  { key: "Dubai", label: "Dubai", short: "Dubai" },
  { key: "Qatar", label: "Qatar", short: "Qatar" },
  { key: "Kuwait", label: "Kuwait", short: "Kuwait" },
  { key: "Singapore", label: "Singapore", short: "Singapore" },
  { key: "Turkey", label: "Diyanet, Türkiye", short: "Diyanet" },
  { key: "Tehran", label: "Institute of Geophysics, Tehran", short: "Tehran" },
  { key: "NorthAmerica", label: "ISNA, North America", short: "ISNA" },
  { key: "MoonsightingCommittee", label: "Moonsighting Committee", short: "Moonsighting" },
];

export const methodShort = (key: string): string => METHODS.find((method) => method.key === key)?.short ?? key;

export const TIME_NAMES = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type TimeName = (typeof TIME_NAMES)[number];

// The six times of a "YYYY-MM-DD" day for these settings.
export function prayerTimesFor(settings: PrayerSettings, day: string): Record<TimeName, Date> {
  const [year, month, date] = day.split("-").map(Number);
  const method = Object.hasOwn(CalculationMethod, settings.method) ? CalculationMethod[settings.method as keyof typeof CalculationMethod] : CalculationMethod.Karachi;
  const params = method();
  params.madhab = settings.asrSchool === "HANAFI" ? Madhab.Hanafi : Madhab.Shafi;
  // adhan reads the calendar day from the Date's own fields.
  const times = new PrayerTimes(new Coordinates(settings.latitude, settings.longitude), new Date(year, month - 1, date), params);
  return { Fajr: times.fajr, Sunrise: times.sunrise, Dhuhr: times.dhuhr, Asr: times.asr, Maghrib: times.maghrib, Isha: times.isha };
}

// "HH:MM" of a time in the app's timezone, for timeLabel().
export const clockOf = (time: Date): string => formatDate(time, "HH:mm");

// The same time in two parts, so a narrow tile can set "5:42" large and its
// "pm" (a dictionary key) small under it: timeLabel()'s words, split.
export function clockParts(time: Date): { clock: string; meridiem: "am" | "pm" } {
  const [hours, minutes] = clockOf(time).split(":").map(Number);
  return { clock: `${hours % 12 || 12}:${String(minutes).padStart(2, "0")}`, meridiem: hours < 12 ? "am" : "pm" };
}

// The next of the five prayers after `now` (tomorrow's Fajr after Isha).
export function nextPrayer(settings: PrayerSettings, today: string, tomorrow: string, now: Date): { prayer: TimeName; at: Date } {
  const times = prayerTimesFor(settings, today);
  for (const prayer of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const) if (times[prayer] > now) return { prayer, at: times[prayer] };
  return { prayer: "Fajr", at: prayerTimesFor(settings, tomorrow).Fajr };
}

// Whole minutes from now until `at`, at least 0.
export const minutesUntil = (at: Date, now: Date): number => Math.max(0, Math.ceil((at.getTime() - now.getTime()) / 60000));
