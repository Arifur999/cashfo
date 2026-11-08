// Settings › Help & support's company card and video guides, as the API
// sends them (GET /api/platform/help), and the pure rules the page uses.

export const VIDEO_CATEGORIES = ["GETTING_STARTED", "INCOME_EXPENSE", "SAVINGS", "LOANS", "GROUP_EXPENSE", "SECURITY", "OTHER"] as const;
export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];
export const CATEGORY_LABEL: Record<VideoCategory, string> = {
  GETTING_STARTED: "Getting started",
  INCOME_EXPENSE: "Income & Expense",
  SAVINGS: "Savings",
  LOANS: "Loans",
  GROUP_EXPENSE: "Group Expense",
  SECURITY: "Security",
  OTHER: "Other",
};
export const WEEK_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];
export const DAY_NAME: Record<WeekDay, string> = { sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" };

export interface HelpCompany {
  name: string;
  tagline: string;
  legalName: string;
  tradeLicence: string;
  hotline: string;
  whatsapp: string;
  email: string;
  website: string;
  facebook: string;
  youtube: string;
  headOffice: string;
  dhakaOffice: string;
  openDays: WeekDay[];
  opensAt: string;
  closesAt: string;
  replyHours: number;
}

export interface HelpVideo {
  id: string;
  titleEn: string;
  titleBn: string | null;
  category: VideoCategory;
  minutes: number;
  youtubeId: string;
  shown: boolean;
  position: number;
}

export interface HelpPageData {
  company: HelpCompany;
  videos: HelpVideo[];
}

// Open now, or when it opens next: from the office days and hours on the
// Dhaka clock. `now` is the Dhaka day of the week (0 = Sunday) and minutes
// since midnight.
export type OfficeState = { open: true; closesAt: string } | { open: false; opensDay: WeekDay | null; opensAt: string; today: boolean; tomorrow: boolean };

const minutesOf = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

export function officeState(company: Pick<HelpCompany, "openDays" | "opensAt" | "closesAt">, now: { day: number; minutes: number }): OfficeState {
  const opens = minutesOf(company.opensAt);
  const closes = minutesOf(company.closesAt);
  const today = WEEK_DAYS[now.day];
  if (company.openDays.includes(today) && now.minutes >= opens && now.minutes < closes) return { open: true, closesAt: company.closesAt };
  if (company.openDays.includes(today) && now.minutes < opens) return { open: false, opensDay: today, opensAt: company.opensAt, today: true, tomorrow: false };
  for (let step = 1; step <= 7; step += 1) {
    const day = WEEK_DAYS[(now.day + step) % 7];
    if (company.openDays.includes(day)) return { open: false, opensDay: day, opensAt: company.opensAt, today: false, tomorrow: step === 1 };
  }
  return { open: false, opensDay: null, opensAt: company.opensAt, today: false, tomorrow: false };
}

// "Saturday to Thursday", or the days listed when they don't run together.
export function officeDays(days: WeekDay[]): WeekDay[][] {
  const order: WeekDay[] = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
  const runs: WeekDay[][] = [];
  for (const day of order) {
    if (!days.includes(day)) continue;
    const last = runs[runs.length - 1];
    if (last && order.indexOf(last[last.length - 1]) === order.indexOf(day) - 1) last.push(day);
    else runs.push([day]);
  }
  return runs;
}

// A video's title in the reader's language.
export const videoTitle = (video: HelpVideo, bangla: boolean) => (bangla && video.titleBn ? video.titleBn : video.titleEn);

// Videos whose title or category matches a search.
export function searchVideos(videos: HelpVideo[], query: string, bangla: boolean, label: (category: VideoCategory) => string): HelpVideo[] {
  const q = query.trim().toLowerCase();
  if (!q) return videos;
  return videos.filter((video) => `${video.titleEn} ${video.titleBn ?? ""} ${videoTitle(video, bangla)} ${label(video.category)}`.toLowerCase().includes(q));
}

// tel: and wa.me links from a typed number ("+880 9612-345678").
export const telHref = (number: string) => `tel:${number.replace(/[^\d+]/g, "")}`;
export const whatsappHref = (number: string) => `https://wa.me/${number.replace(/\D/g, "")}`;
export const webHref = (link: string) => (/^https?:\/\//i.test(link) ? link : `https://${link}`);
