"use client";

import { Ban, CircleAlert, Clock, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// The sign-in messages (AdminLoginStates): one clear line over the form.
// Wrong details and a wrong code are red with a warning sign, a turned-off
// account orange with a "no" sign, too many tries red with a clock, a
// session that ended blue; a quiet grey note carries the small print.
const TONES = {
  error: { box: "bg-loss-wash text-loss-ink", icon: TriangleAlert },
  suspended: { box: "bg-warn2-wash text-warn2-ink", icon: Ban },
  throttled: { box: "bg-loss-wash text-loss-ink", icon: Clock },
  info: { box: "bg-note-blue text-tint-blue-ink", icon: Info },
  warning: { box: "border border-warning-line bg-warning-50 text-warning-ink", icon: TriangleAlert },
  note: { box: "bg-page text-ink-2 text-small", icon: Info },
  problem: { box: "bg-loss-wash text-loss-ink", icon: CircleAlert },
} as const;

export type AuthAlertTone = keyof typeof TONES;

interface AuthAlertProps {
  tone: AuthAlertTone;
  children: React.ReactNode;
  // An icon other than the tone's own (the note under the sign-in form).
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  // "alert" for something that just went wrong; a note there from the
  // start is "note".
  role?: "alert" | "status" | "note";
  className?: string;
}

const AuthAlert = ({ tone, children, icon, role = "alert", className }: AuthAlertProps) => {
  const Icon = icon ?? TONES[tone].icon;
  return (
    <div role={role} className={cn("flex gap-2.5 rounded-field px-3.5 py-3 text-body leading-[1.5]", tone === "note" && "rounded-[14px] text-small", TONES[tone].box, className)}>
      <Icon className={cn("mt-0.5 shrink-0", tone === "note" ? "size-4" : "size-4.5")} aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};

export default AuthAlert;
