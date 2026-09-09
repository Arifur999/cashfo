"use client";

import { Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { AdminOption, SupportTicketDetail, TicketMessageRow, TicketPriority, TicketStatus } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { addTicketMessageAction, assignTicketAction, updateTicketAction } from "@/app/admin/(dashboard)/support/_actions";
import { MessageThread } from "./MessageThread";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketStatusBadge } from "./TicketStatusBadge";

const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_USER", "RESOLVED", "CLOSED"];
const PRIORITY_OPTIONS: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

interface TicketDetailClientProps {
  ticket: SupportTicketDetail;
  admins: AdminOption[];
  canManage: boolean;
}

export function TicketDetailClient({ ticket, admins, canManage }: TicketDetailClientProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [assignedToAdminId, setAssignedToAdminId] = useState(ticket.assignedToAdminId ?? "");
  const [reply, setReply] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<TicketMessageRow[]>([]);
  const wasRefreshing = useRef(false);

  useEffect(() => {
    if (wasRefreshing.current && !isRefreshing) {
      setOptimisticMessages([]);
    }
    wasRefreshing.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setAssignedToAdminId(ticket.assignedToAdminId ?? "");
  }, [ticket.status, ticket.priority, ticket.assignedToAdminId]);

  async function handleStatusChange(nextStatus: TicketStatus) {
    if (nextStatus === "RESOLVED" && !window.confirm(t("Mark as resolved?"))) {
      return;
    }
    setStatus(nextStatus);
    const result = await updateTicketAction(ticket.id, { status: nextStatus });
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      toast.error(result.message ?? t("Failed to update ticket"));
      setStatus(ticket.status);
    }
  }

  async function handlePriorityChange(nextPriority: TicketPriority) {
    setPriority(nextPriority);
    const result = await updateTicketAction(ticket.id, { priority: nextPriority });
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      toast.error(result.message ?? t("Failed to update ticket"));
      setPriority(ticket.priority);
    }
  }

  async function handleAssignChange(nextAdminId: string) {
    setAssignedToAdminId(nextAdminId);
    const result = await assignTicketAction(ticket.id, nextAdminId || null);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      toast.error(result.message ?? t("Failed to assign ticket"));
      setAssignedToAdminId(ticket.assignedToAdminId ?? "");
    }
  }

  async function handleSendReply() {
    if (!reply.trim()) return;
    setIsSendingReply(true);
    const result = await addTicketMessageAction(ticket.id, reply.trim());
    setIsSendingReply(false);
    if (result.success && result.data) {
      setOptimisticMessages((prev) => [...prev, result.data!]);
      setReply("");
      if (ticket.status === "OPEN") setStatus("IN_PROGRESS");
      startTransition(() => router.refresh());
    } else {
      toast.error(result.message ?? t("Failed to send reply"));
    }
  }

  const allMessages = [...ticket.messages, ...optimisticMessages];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm shadow-black/5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="text-lg font-semibold text-neutral-900">{ticket.subject}</h1>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {canManage ? (
              <>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <select
                  value={priority}
                  onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <select
                  value={assignedToAdminId}
                  onChange={(e) => handleAssignChange(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                >
                  <option value="">{t("Unassigned")}</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <TicketStatusBadge status={status} />
                <TicketPriorityBadge priority={priority} />
                <span className="text-sm text-neutral-500">
                  {admins.find((a) => a.id === assignedToAdminId)?.name ?? t("Unassigned")}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm shadow-black/5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">{t("Conversation")}</h2>
          <MessageThread messages={allMessages} userName={ticket.platformUser?.name ?? t("User")} admins={admins} />

          {canManage && (
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <textarea
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={t("Write a reply...")}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!reply.trim() || isSendingReply}
                  onClick={handleSendReply}
                  className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
                >
                  {isSendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {t("Send Reply")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">{t("User Info")}</h2>
          {ticket.platformUser ? (
            <div className="space-y-1.5 text-sm">
              <p className="font-medium text-neutral-900">{ticket.platformUser.name}</p>
              <p className="text-neutral-500">{ticket.platformUser.email}</p>
              <p className="text-neutral-500">{ticket.platformUser.plan?.name ?? t("No plan")}</p>
              <Link
                href={`/admin/users/${ticket.platformUser.id}`}
                className="mt-2 inline-block text-sm font-medium text-brand-primary hover:underline"
              >
                {t("View user profile")}
              </Link>
            </div>
          ) : (
            <p className="text-sm text-neutral-400">{t("User not found.")}</p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">{t("Details")}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">{t("Category")}</dt>
              <dd className="text-neutral-900">{ticket.category.replaceAll("_", " ")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">{t("Created")}</dt>
              <dd className="text-neutral-900">{new Date(ticket.createdAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">{t("Resolved")}</dt>
              <dd className="text-neutral-900">{ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString() : "—"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
