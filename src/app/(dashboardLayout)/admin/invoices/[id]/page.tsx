import type { Metadata } from "next";
import InvoiceDocument from "@/components/modules/Admin/Invoices/InvoiceDocument";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { getInvoiceById } from "@/services/invoice.services";

export const metadata: Metadata = { title: "Invoice" };

const InvoiceDetailPage = async ({ params }: PageProps<"/admin/invoices/[id]">) => {
  const { id } = await params;
  const invoice = await fetchOrNotFound(getInvoiceById(id));

  return <InvoiceDocument invoice={invoice} />;
};

export default InvoiceDetailPage;
