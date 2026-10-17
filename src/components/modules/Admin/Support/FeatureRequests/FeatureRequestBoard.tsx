"use client";

import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { updateFeatureRequestStatusAction } from "@/app/(dashboardLayout)/admin/feature-requests/_action";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { featureRequestsQuery } from "@/queries/featureRequest.queries";
import type { FeatureRequestStatus, IFeatureRequest } from "@/types/featureRequest.types";
import FeatureRequestCard from "./FeatureRequestCard";
import { DECLINED_COLUMN, FEATURE_REQUEST_COLUMNS, FEATURE_REQUEST_STATUS_LABEL } from "./featureRequestOptions";
import T from "@/components/shared/T";

type Move = { id: string; status: FeatureRequestStatus };

const applyMove = (requests: IFeatureRequest[], move: Move) => requests.map((request) => (request.id === move.id ? { ...request, status: move.status } : request));

// The design's board: a column per status, most-voted first in each, with
// Declined tucked away until asked for. A card moves by drag or from its
// menu, and shows in its new column at once.
const FeatureRequestBoard = ({ canManage }: { canManage: boolean }) => {
  const requests = useQuery(featureRequestsQuery()).data?.data ?? [];
  const [shown, addMove] = useOptimistic(requests, applyMove);
  const [, startTransition] = useTransition();
  const [showDeclined, setShowDeclined] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<FeatureRequestStatus | null>(null);
  const { translate } = useLocale();

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
        <button type="button" className="font-semibold text-ink-2 hover:text-ink" onClick={() => setShowDeclined((value) => !value)} aria-pressed={showDeclined}>
          {showDeclined ? translate("Hide declined") : translate("Declined ({count})", { count: formatNumber(declined.length) })}
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
              onDragLeave={canManage ? () => setOver((current) => (current === column.status ? null : current)) : undefined}
              onDrop={
                canManage
                  ? (event) => {
                      event.preventDefault();
                      const id = event.dataTransfer.getData("text/plain");
                      setOver(null);
                      setDragging(null);
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
                <span className="text-caption font-semibold text-ink-muted tabular-nums">{formatNumber(cards.length)}</span>
              </div>
              {cards.map((request) => (
                <FeatureRequestCard
                  key={request.id}
                  request={request}
                  canManage={canManage}
                  onMove={(status) => move(request.id, status)}
                  onDragStart={() => setDragging(request.id)}
                  dragging={dragging === request.id}
                />
              ))}
              {cards.length === 0 && <p className="px-1 py-2 text-caption text-ink-muted"><T>Nothing here.</T></p>}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default FeatureRequestBoard;
