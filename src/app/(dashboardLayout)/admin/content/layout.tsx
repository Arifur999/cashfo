import ContentTabs from "@/components/modules/Admin/Content/ContentTabs";
import PageHeader from "@/components/shared/PageHeader";

// Shared by every content tab, so switching tabs keeps the header and tab
// bar in place and only the panel below loads.
const ContentLayout = ({ children }: LayoutProps<"/admin/content">) => {
  return (
    <div className="space-y-6">
      <PageHeader title="Content & Configuration" description="What the end-user app shows -- changed here, without a deploy." />
      <ContentTabs />
      {children}
    </div>
  );
};

export default ContentLayout;
