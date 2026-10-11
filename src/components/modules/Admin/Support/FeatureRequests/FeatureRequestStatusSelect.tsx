"use client";

import { updateFeatureRequestStatusAction } from "@/app/(dashboardLayout)/admin/feature-requests/_action";
import InlineStatusSelect from "@/components/shared/form/InlineStatusSelect";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import { humanizeEnum } from "@/lib/statusBadge";
import type { FeatureRequestStatus, IFeatureRequest } from "@/types/featureRequest.types";
import { FEATURE_REQUEST_STATUS_OPTIONS } from "./featureRequestOptions";

const FeatureRequestStatusSelect = ({ request }: { request: IFeatureRequest }) => {
  const { run } = useActionMutation({
    action: (next: FeatureRequestStatus) => updateFeatureRequestStatusAction(request.id, { status: next }),
    successMessage: (updated) => `"${updated.title}" marked ${humanizeEnum(updated.status).toLowerCase()}`,
    invalidateKeys: [queryKeys.featureRequests.all],
    refreshRoute: false,
  });

  return (
    <InlineStatusSelect ariaLabel={`Status of "${request.title}"`} value={request.status} options={FEATURE_REQUEST_STATUS_OPTIONS} onChange={run} />
  );
};

export default FeatureRequestStatusSelect;
