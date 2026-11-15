import type { IdeaStatus, SupportConversation, SupportStatus, SupportTopic } from "./api";

type ChipTone = "mint" | "info" | "warning" | "neutral" | "insights";

// Settings > Help's topics (the SettingsHelp board's "What is it about?"),
// as the support team's categories.
export const SUPPORT_TOPICS: { value: SupportTopic; label: string }[] = [
  { value: "TECHNICAL", label: "Question" },
  { value: "BUG_REPORT", label: "Problem with the app" },
  { value: "BILLING", label: "Payment or plan" },
  { value: "FEATURE_REQUEST", label: "Feature idea" },
  { value: "ACCOUNT", label: "Account and security" },
  { value: "OTHER", label: "Other" },
];

// A conversation's state as the HelpConversation board names and colours it:
// an answer from the team that waits on the customer reads "Waiting on you",
// and a closed one reads as solved.
export const SUPPORT_STATUS: Record<SupportStatus, { label: string; className: string }> = {
  OPEN: { label: "Open@@status", className: "bg-tint-blue text-tint-blue-ink" },
  IN_PROGRESS: { label: "In progress", className: "bg-warning-soft text-warning" },
  WAITING_ON_USER: { label: "Waiting on you", className: "bg-wait-soft text-wait-ink" },
  RESOLVED: { label: "Solved", className: "bg-success-soft text-tint-green-ink" },
  CLOSED: { label: "Solved", className: "bg-success-soft text-tint-green-ink" },
};

// Whether the team's last word waits on the customer.
export const waitsOnYou = (conversation: SupportConversation) =>
  conversation.status === "WAITING_ON_USER" || ((conversation.status === "OPEN" || conversation.status === "IN_PROGRESS") && conversation.messages.at(-1)?.senderType === "ADMIN");

export const supportStatusOf = (conversation: SupportConversation) => (waitsOnYou(conversation) ? SUPPORT_STATUS.WAITING_ON_USER : SUPPORT_STATUS[conversation.status]);

// The topic as the conversation's header writes it.
export const topicName = (category: SupportConversation["category"]) => SUPPORT_TOPICS.find((topic) => topic.value === category)?.label ?? "Other";

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
