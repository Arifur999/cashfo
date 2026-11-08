// Settings › Help & support: the company card and the video guides
// (server-only reader).
import "server-only";
import { customerApi } from "./apiClient";
import type { HelpPageData } from "./helpPage";
import { emptyUnlessOutage } from "./readFallback";

// null when it can't be read: the page still has its questions and messages.
export async function getHelpPage(): Promise<HelpPageData | null> {
  try {
    return (await customerApi.get<HelpPageData>("/api/platform/help")).data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
}
