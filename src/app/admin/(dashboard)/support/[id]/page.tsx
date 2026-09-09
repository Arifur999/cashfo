import { notFound } from "next/navigation";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { getAdminOptions, getTicketById } from "@/lib/tickets";
import { TicketDetailClient } from "@/components/support/TicketDetailClient";

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { id } = await params;
  const [ticket, admins, admin] = await Promise.all([getTicketById(id), getAdminOptions(), getCurrentAdmin()]);

  if (!ticket) {
    notFound();
  }

  const canManage = admin?.role === "SUPER_ADMIN" || admin?.role === "SUPPORT_ADMIN";

  return <TicketDetailClient ticket={ticket} admins={admins} canManage={canManage} />;
}
