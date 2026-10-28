import TabsNav from "@/components/shared/TabsNav";

// Each content area is its own route, so a tab is linkable and only loads
// its own data. The last tab holds the starting categories and, beside
// them, the starting wallets and accounts; the board calls it Categories.
const ContentTabs = () => {
  return (
    <TabsNav
      label="Content"
      tabs={[
        { label: "Announcements", href: "/admin/content/announcements" },
        { label: "Legal pages", href: "/admin/content/legal" },
        { label: "Translations", href: "/admin/content/translations" },
        { label: "Categories", href: "/admin/content/categories" },
      ]}
    />
  );
};

export default ContentTabs;
