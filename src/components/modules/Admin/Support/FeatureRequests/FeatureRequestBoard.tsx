"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Info } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { updateFeatureRequestStatusAction } from "@/app/(dashboardLayout)/admin/feature-requests/_action";
import ErrorState from "@/components/smartly/ErrorState";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { featureRequestsQuery } from "@/queries/featureRequest.queries";
import type { FeatureRequestStatus, IFeatureRequest } from "@/types/featureRequest.types";
import FeatureRequestCard from "./FeatureRequestCard";
import FeatureRequestDrawer from "./FeatureRequestDrawer";
import { DECLINED_COLUMN, FEATURE_REQUEST_COLUMNS, FEATURE_REQUEST_STATUS_LABEL } from "./featureRequestOptions";
import T from "@/components/shared/T";

type Move = { id: string; status: FeatureRequestStatus };

const applyMove = (requests: IFeatureRequest[], move: Move) => requests.map((request) => (request.id === move.id ? { ...request, status: move.status } : request));

const NO_REQUESTS: IFeatureRequest[] = [];

// The design's board: a column per status, most-voted first in each, with
// Declined tucked away until asked for. A card moves by drag or from its
// menu, and shows in its new column at once; its title opens the request.
const FeatureRequestBoard = ({ canManage }: { canManage: boolean }) => {
  const query = useQuery(featureRequestsQuery());
  const requests = query.data?.data ?? NO_REQUESTS;
  const [shown, addMove] = useOptimistic(requests, applyMove);
  const [, startTransition] = useTransition();
  const [showDeclined, setShowDeclined] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<FeatureRequestStatus | null>(null);
  // The request in the drawer, kept while it slides away.
  const [openId, setOpenId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { locale, translate } = useLocale();

  const update = useActionMutation({
    action: (move: Move) => updateFeatureRequestStatusAction(move.id, { status: move.status }),
    successMessage: (updated) => translate('"{title}" moved to {status}', { title: updated.title, status: translate(FEATURE_REQUEST_STATUS_LABEL[updated.status]) }),
    invalidateKeys: [queryKeys.featureRequests.all],
    refreshRoute: false,
  });

  const move = (id: string, status: FeatureRequestStatus) => {
    if (shown.find((request) => request.id === id)?.status === status) return;
    startTransition(async () => {
      addMove({ id, status });
      await update.run({ id, status });
    });
  };

  const endDrag = () => {
    setDragging(null);
    setOver(null);
  };

  // An outage isn't an empty board: say it didn't load, and offer to try again.
  if (query.isError && !query.data) {
    return <ErrorState title={translate("Couldn't load feature requests")} description={translate("Try again in a moment.")} onRetry={() => void query.refetch()} />;
  }

  const declined = shown.filter((request) => request.status === "DECLINED");
  const columns = showDeclined ? [...FEATURE_REQUEST_COLUMNS, DECLINED_COLUMN] : FEATURE_REQUEST_COLUMNS;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 text-small text-ink-2">
        <span className="flex items-center gap-2">
          <Info className="size-3.75 shrink-0 text-ink-muted" aria-hidden="true" />
          <T>{canManage ? "Drag a card to change its status, or use its menu." : "What people have asked for, most voted first."}</T>
        </span>
        <span className="flex-1" />
        {/* One label; the pressed state, drawn with a tick, says whether the
            column is showing. */}
        <button
          type="button"
          className={cn("inline-flex items-center gap-1.5 rounded-sm px-2 font-semibold text-ink-2 hover:text-ink pointer-coarse:min-h-11", showDeclined && "bg-mint-50 text-brand-ink")}
          onClick={() => setShowDeclined((value) => !value)}
          aria-pressed={showDeclined}
        >
          {showDeclined && <Check className="size-3.5" aria-hidden="true" />}
          {translate("Show declined ({count})", { count: formatCount(declined.length, locale) })}
        </button>
      </div>
      <div className={cn("grid items-start gap-3", showDeclined ? "xl:grid-cols-6 md:grid-cols-3" : "xl:grid-cols-5 md:grid-cols-3")}>
        {columns.map((column) => {
          const cards = shown.filter((request) => request.status === column.status).sort((a, b) => b.voteCount - a.voteCount);
          return (
            <section
              key={column.status}
              aria-label={translate(column.label)}
              onDragOver={canManage ? (event) => { event.preventDefault(); if (over !== column.status) setOver(column.status); } : undefined}
              // Moving onto a card inside the column isn't leaving it.
              onDragLeave={canManage ? (event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver((current) => (current === column.status ? null : current)); } : undefined}
              onDrop={
                canManage
                  ? (event) => {
                      event.preventDefault();
                      const id = event.dataTransfer.getData("text/plain");
                      endDrag();
                      if (id) move(id, column.status);
                    }
                  : undefined
              }
              className={cn("flex min-h-40 flex-col gap-2 rounded-lg p-3 transition-colors", over === column.status ? "bg-mint-50" : "bg-surface-sunken")}
            >
              <div className="flex items-center gap-2 px-1 py-0.5">
                <span className={cn("size-2 rounded-full", column.dot)} aria-hidden="true" />
                <h2 className="grow text-body font-semibold text-ink">
                  <T>{column.label}</T>
                </h2>
                <span className="text-caption font-semibold text-ink-muted tabular-nums">{formatCount(cards.length, locale)}</span>
              </div>
              {cards.map((request) => (
                <FeatureRequestCard
                  key={request.id}
                  request={request}
                  canManage={canManage}
                  onMove={(status) => move(request.id, status)}
                  onOpen={() => {
                    setOpenId(request.id);
                    setIsDrawerOpen(true);
                  }}
                  onDragStart={() => setDragging(request.id)}
                  onDragEnd={endDrag}
                  dragging={dragging === request.id}
                />
              ))}
              {cards.length === 0 && <p className="px-1 py-2 text-caption text-ink-muted"><T>Nothing here.</T></p>}
            </section>
          );
        })}
      </div>
      <FeatureRequestDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        request={shown.find((request) => request.id === openId)}
        canManage={canManage}
        onMove={(status) => openId && move(openId, status)}
      />
    </div>
  );
};

export default FeatureRequestBoard;
