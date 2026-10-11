"use client";

import { useOptimistic, useTransition } from "react";
import { updateFeatureRequestStatusAction } from "@/app/(dashboardLayout)/admin/feature-requests/_action";
import SelectControl from "@/components/shared/form/SelectControl";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import { humanizeEnum } from "@/lib/statusBadge";
import type { FeatureRequestStatus, IFeatureRequest } from "@/types/featureRequest.types";
import { FEATURE_REQUEST_STATUS_OPTIONS } from "./featureRequestOptions";

// Inline in the table row: the new status shows at once and the refetched
// list confirms it (or the old one returns with the error toast).
const FeatureRequestStatusSelect = ({ request }: { request: IFeatureRequest }) => {
  const [status, setOptimisticStatus] = useOptimistic(request.status);
  const [isPending, startTransition] = useTransition();
  const update = useActionMutation({
    action: (next: FeatureRequestStatus) => updateFeatureRequestStatusAction(request.id, { status: next }),
    successMessage: (updated) => `"${updated.title}" marked ${humanizeEnum(updated.status).toLowerCase()}`,
    invalidateKeys: [queryKeys.featureRequests.all],
    refreshRoute: false,
  });

  return (
    <SelectControl
      ariaLabel={`Status of "${request.title}"`}
      size="sm"
      value={status}
      options={FEATURE_REQUEST_STATUS_OPTIONS}
      disabled={isPending}
      className="w-36"
      onValueChange={(next) =>
        startTransition(async () => {
          setOptimisticStatus(next);
          await update.run(next);
        })
      }
    />
  );
};

export default FeatureRequestStatusSelect;
