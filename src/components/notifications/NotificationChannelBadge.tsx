import { Bell, Mail, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationChannel } from "@/lib/api";

const STYLES: Record<NotificationChannel, string> = {
  EMAIL: "bg-blue-100 text-blue-700",
  SMS: "bg-purple-100 text-purple-700",
  IN_APP_PUSH: "bg-teal-100 text-teal-700",
};

const ICONS: Record<NotificationChannel, typeof Mail> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  IN_APP_PUSH: Bell,
};

const LABELS: Record<NotificationChannel, string> = {
  EMAIL: "Email",
  SMS: "SMS",
  IN_APP_PUSH: "In-App Push",
};

export function NotificationChannelBadge({ channel }: { channel: NotificationChannel }) {
  const Icon = ICONS[channel];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[channel])}>
      <Icon className="h-3 w-3" />
      {LABELS[channel]}
    </span>
  );
}
