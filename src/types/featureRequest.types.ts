export const FEATURE_REQUEST_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "PLANNED", "IN_PROGRESS", "SHIPPED", "DECLINED"] as const;
export type FeatureRequestStatus = (typeof FEATURE_REQUEST_STATUSES)[number];

export interface IFeatureRequest {
  id: string;
  platformUserId: string;
  title: string;
  description: string;
  status: FeatureRequestStatus;
  voteCount: number;
  createdAt: string;
  // Who asked: a customer's account, or an older request's platform user;
  // null once gone.
  requester?: { id: string; name: string; email: string; isCustomer: boolean } | null;
}
