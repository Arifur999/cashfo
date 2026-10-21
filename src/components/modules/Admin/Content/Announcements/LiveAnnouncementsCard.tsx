"use client";

import Card from "@/components/smartly/Card";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IAnnouncement } from "@/types/announcement.types";
import AnnouncementPreview from "./AnnouncementPreview";
import T from "@/components/shared/T";

interface LiveAnnouncementsCardProps {
  announcements: IAnnouncement[];
  // Plan names by id, for the banners only one plan sees.
  planNames: Map<string, string>;
}

// "Showing in the app now": the banners live at this moment, newest first,
// drawn as the app draws them. The app stacks every live banner a reader's
// plan gets, each one closable, so a plan-only banner says whose it is.
const LiveAnnouncementsCard = ({ announcements, planNames }: LiveAnnouncementsCardProps) => {
  const { translate } = useLocale();
  const live = announcements.filter((announcement) => announcement.status === "ACTIVE").sort((a, b) => b.startAt.localeCompare(a.startAt));

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-title text-ink"><T>Showing in the app now</T></h2>
        <span className="text-small text-ink-muted"><T>Users see every live banner, newest first, and can close each one.</T></span>
      </div>
      {live.length === 0 ? (
        <p className="text-small text-ink-muted"><T>Nothing is showing right now.</T></p>
      ) : (
        live.map((announcement) => (
          <div key={announcement.id} className="flex flex-col gap-1">
            <AnnouncementPreview type={announcement.type} title={announcement.title} body={announcement.body} />
            {announcement.targetPlan && (
              <span className="text-caption text-ink-muted">
                {planNames.has(announcement.targetPlan) ? translate("{name} plan only", { name: planNames.get(announcement.targetPlan) ?? "" }) : translate("One plan only")}
              </span>
            )}
          </div>
        ))
      )}
    </Card>
  );
};

export default LiveAnnouncementsCard;
