import Card from "@/components/smartly/Card";
import type { IAnnouncement } from "@/types/announcement.types";
import AnnouncementPreview from "./AnnouncementPreview";

// "Showing in the app now": the banners people see at this moment, newest
// first, drawn as the app draws them.
const LiveAnnouncementsCard = ({ announcements }: { announcements: IAnnouncement[] }) => {
  const live = announcements.filter((announcement) => announcement.status === "ACTIVE").sort((a, b) => b.startAt.localeCompare(a.startAt));

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-title text-ink">Showing in the app now</h2>
        <span className="text-small text-ink-muted">Users see one banner at a time, newest first</span>
      </div>
      {live.length === 0 ? (
        <p className="text-small text-ink-muted">Nothing is showing right now.</p>
      ) : (
        live.map((announcement) => <AnnouncementPreview key={announcement.id} type={announcement.type} title={announcement.title} body={announcement.body} />)
      )}
    </Card>
  );
};

export default LiveAnnouncementsCard;
