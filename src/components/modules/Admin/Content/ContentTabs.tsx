import TabsNav from "@/components/shared/TabsNav";

// Each content area is its own route, so a tab is linkable and only loads
// its own data.
const ContentTabs = () => {
  return (
    <TabsNav
      label="Content sections"
      tabs={[
        { label: "Chart of Accounts", href: "/admin/content", exact: true },
        { label: "Categories", href: "/admin/content/categories" },
        { label: "Translations", href: "/admin/content/translations" },
        { label: "Announcements", href: "/admin/content/announcements" },
        { label: "Legal Pages", href: "/admin/content/legal" },
      ]}
    />
  );
};

export default ContentTabs;
