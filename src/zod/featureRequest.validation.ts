import { z } from "zod";
import { FEATURE_REQUEST_STATUSES } from "@/types/featureRequest.types";

export const updateFeatureRequestStatusServerZodSchema = z.object({ status: z.enum(FEATURE_REQUEST_STATUSES) });
