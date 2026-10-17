import { redirect } from "next/navigation";

// The Content section opens on its first tab; the starting accounts moved
// onto the Categories tab.
const ContentPage = () => redirect("/admin/content/announcements");

export default ContentPage;
