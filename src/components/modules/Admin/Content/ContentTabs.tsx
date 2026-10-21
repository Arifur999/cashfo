import TabsNav from "@/components/shared/TabsNav";

// Each content area is its own route, so a tab is linkable and only loads
// its own data. The last tab holds the starting categories and the starting
// wallets and accounts, so it names both.
const ContentTabs = () => {
  return (
    <TabsNav
      label="Content"
      tabs={[
        { label: "Announcements", href: "/admin/content/announcements" },
        { label: "Legal pages", href: "/admin/content/legal" },
        { label: "Translations", href: "/admin/content/translations" },
        { label: "Categories & accounts", href: "/admin/content/categories" },
      ]}
    />
  );
};

export default ContentTabs;
