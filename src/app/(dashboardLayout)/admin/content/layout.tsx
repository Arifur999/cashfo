import ContentHeaderAction from "@/components/modules/Admin/Content/ContentHeaderAction";
import { CONTENT_PAGE } from "@/components/modules/Admin/Content/contentPage";
import ContentTabs from "@/components/modules/Admin/Content/ContentTabs";
import PageHeader from "@/components/shared/PageHeader";
import { canManage } from "@/lib/authUtils";
import { getUserInfo } from "@/services/auth.services";

// Shared by every content tab, so switching tabs keeps the header and tab
// bar in place and only the panel below loads.
const ContentLayout = async ({ children }: LayoutProps<"/admin/content">) => {
  const admin = await getUserInfo();

  return (
    <div className="space-y-4">
      <PageHeader {...CONTENT_PAGE} actions={<ContentHeaderAction canManage={canManage(admin?.role, "content")} />} />
      <ContentTabs />
      {children}
    </div>
  );
};

export default ContentLayout;
