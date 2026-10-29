import T from "@/components/shared/T";
import TabsNav from "@/components/shared/TabsNav";

// The three tabs, and one line on how they fit together.
const NotificationTabs = () => {
  return (
    <div className="flex flex-col gap-3">
      <TabsNav
        label="Notifications"
        tabs={[
          { label: "Templates", href: "/admin/notifications", exact: true },
          { label: "Campaigns", href: "/admin/notifications/campaigns" },
          { label: "Send history", href: "/admin/notifications/history" },
        ]}
      />
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
        <li>
          <b className="font-semibold text-ink-2">1.</b> <T>Templates hold the wording</T>
        </li>
        <li aria-hidden="true">→</li>
        <li>
          <b className="font-semibold text-ink-2">2.</b> <T>A campaign sends one to a group of users</T>
        </li>
        <li aria-hidden="true">→</li>
        <li>
          <b className="font-semibold text-ink-2">3.</b> <T>Send history shows who got what</T>
        </li>
      </ol>
    </div>
  );
};

export default NotificationTabs;
