import T from "@/components/shared/T";
import Card from "@/components/smartly/Card";
import SkeletonRows from "@/components/smartly/SkeletonRows";

// Between two Settings sections. The customer layout's loading screen
// keys on the "settings" segment, which stays the same from Security to
// Resources, so without this the old section sat there until the server
// answered. Here the heading and the rail stay (they belong to the layout),
// the rail's highlight moves at once, and the section shows its outline.
export default function SettingsLoading() {
  return (
    <div role="status" className="flex max-w-200 flex-col gap-4">
      <span className="sr-only">
        <T>Loading...</T>
      </span>
      <Card aria-hidden="true" padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-2 px-6 py-5">
          <span className="block h-3 w-40 animate-pulse rounded-sm bg-surface-sunken motion-reduce:animate-none" />
          <span className="block h-2.5 w-64 max-w-full animate-pulse rounded-sm bg-surface-sunken motion-reduce:animate-none" />
        </div>
        <SkeletonRows rows={4} avatar={false} className="border-t border-divider" />
      </Card>
    </div>
  );
}
