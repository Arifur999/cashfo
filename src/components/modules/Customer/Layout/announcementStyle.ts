import { Info, Megaphone, TriangleAlert, Wrench, type LucideIcon } from "lucide-react";
import type { AnnouncementType } from "@/lib/customer/platform";

// How the app draws each kind of announcement: the Banner's tone and the
// icon beside it. The admin's type picker, list chip and preview read the
// same pairing, so they can't drift from what customers see. A plain
// module rather than part of the "use client" banner, so a Server
// Component can read it too.
export const ANNOUNCEMENT_BANNER_STYLE: Record<AnnouncementType, { tone: "info" | "warning" | "mint" | "danger"; Icon: LucideIcon }> = {
  INFO: { tone: "info", Icon: Info },
  WARNING: { tone: "warning", Icon: TriangleAlert },
  PROMOTION: { tone: "mint", Icon: Megaphone },
  MAINTENANCE: { tone: "danger", Icon: Wrench },
};
