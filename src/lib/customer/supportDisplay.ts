import type { IdeaStatus, SupportStatus, SupportTopic } from "./api";

type ChipTone = "mint" | "info" | "warning" | "neutral" | "insights";

// Settings > Help's topic list, as the support team's categories.
export const SUPPORT_TOPICS: { value: SupportTopic; label: string }[] = [
  { value: "TECHNICAL", label: "A question about using the app" },
  { value: "BUG_REPORT", label: "Something isn't working" },
  { value: "ACCOUNT", label: "My account or signing in" },
  { value: "BILLING", label: "Plans and payments" },
  { value: "OTHER", label: "Something else" },
];

// A conversation's state, in the customer's words.
export const SUPPORT_STATUS: Record<SupportStatus, { label: string; tone: ChipTone }> = {
  OPEN: { label: "Sent", tone: "neutral" },
  IN_PROGRESS: { label: "Being looked at", tone: "info" },
  WAITING_ON_USER: { label: "Waiting for you", tone: "warning" },
  RESOLVED: { label: "Solved", tone: "mint" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

export const IDEA_STATUS: Record<IdeaStatus, { label: string; tone: ChipTone }> = {
  SUBMITTED: { label: "New", tone: "neutral" },
  UNDER_REVIEW: { label: "Under review", tone: "info" },
  PLANNED: { label: "Planned", tone: "insights" },
  IN_PROGRESS: { label: "Being built", tone: "warning" },
  SHIPPED: { label: "Shipped", tone: "mint" },
  DECLINED: { label: "Not planned", tone: "neutral" },
};

// The largest screenshot the API takes, and the kinds it takes.
export const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;
export const SCREENSHOT_ACCEPT = "image/png,image/jpeg,image/webp";

// The screenshot's address for an <img> or a new tab.
export const screenshotUrl = (attachmentId: string) => `/api/support-attachments/${encodeURIComponent(attachmentId)}`;
