"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type BusinessDetail, type BusinessLimits, type WorkspaceListItem } from "./api";
import { clearWorkspaceUnlock, getAccessToken, setWorkspaceUnlock } from "@/lib/tokenUtils";
import { resolveActiveWorkspace, setActiveBusinessCookie } from "./activeBusiness";
import { getCurrentUser } from "./auth";
import { getBusinessLimits } from "./businesses";
import { customerApi } from "./apiClient";
import { isSwitchableWorkspace, landingAfterSwitch, switchTarget } from "./workspaceSwitch";

export interface ActionResult<T = void> {
  success: boolean;
  message?: string;
  data?: T;
}

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${accessToken}` };
}

// What the API adds when a PIN is entered or set: the unlock this device's
// requests to that workspace carry. It goes into its cookie, never to the
// browser.
interface WithUnlock {
  unlock?: { unlockToken: string };
}

async function keepUnlock<T extends WithUnlock>(businessId: string, data: T): Promise<Omit<T, "unlock">> {
  const { unlock, ...rest } = data;
  if (unlock?.unlockToken) {
    await setWorkspaceUnlock(businessId, unlock.unlockToken);
  }
  return rest;
}

async function callApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage) };
    }
    return { success: false, message: fallbackMessage };
  }
}

// Opens another workspace on this device. The id comes from the browser, so
// it only counts once the account's memberships, read fresh, say it is one
// of their personal or business workspaces. `from` is the page the switch
// was made on (also the browser's word, so only ever a path inside the
// app); the answer says where to go next. Messages are English keys for
// t(). Never throws.
export async function switchWorkspaceAction(businessId: string, from?: string): Promise<ActionResult<{ landing: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Your session has expired. Please sign in again." };
    }
    const target = switchTarget(user.businesses, businessId);
    if (!target) {
      return { success: false, message: "That workspace isn't available any more." };
    }
    await setActiveBusinessCookie(target.id);
    return { success: true, data: { landing: landingAfterSwitch(typeof from === "string" ? from : null, target.type) } };
  } catch {
    return { success: false, message: "Couldn't open that workspace. Please try again." };
  }
}

export interface CreateBusinessInput {
  name: string;
  currency: string;
  phone?: string;
  email?: string;
  pin?: string;
  // Defaults to "BUSINESS" (every existing caller creates a second
  // Business-type workspace) -- Group Expense's own create flow passes
  // "GROUP" explicitly. See BusinessesService.create() -- PERSONAL can
  // never be created here either way.
  type?: "BUSINESS" | "GROUP";
}

// A new business workspace gives the account a choice. When nothing was
// chosen on this device yet (an account that only ever had one workspace
// has never been asked), the layout would now stop to ask "Which
// workspace?" and pull the customer off the page they made it on, so the
// workspace open now is remembered first. Best effort: the new one exists
// either way, so a failure here must never turn the create into an error.
async function rememberOpenWorkspace() {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const open = await resolveActiveWorkspace(user.businesses);
    if (open.business && !open.remembered) await setActiveBusinessCookie(open.business.id);
  } catch {
    // The chooser asks once instead.
  }
}

export async function createBusinessAction(input: CreateBusinessInput): Promise<ActionResult<WorkspaceListItem>> {
  return callApi(async () => {
    const res = await customerApi.post<WorkspaceListItem & WithUnlock>(
      `${API_BASE_URL}/api/businesses`,
      { name: input.name, type: input.type ?? "BUSINESS", currency: input.currency, phone: input.phone, email: input.email, pin: input.pin },
      { headers: await authHeaders() },
    );
    const created = await keepUnlock(res.data.id, res.data);
    // A group is never switched into, so it adds no choice.
    if (isSwitchableWorkspace(created)) await rememberOpenWorkspace();
    return created;
  }, "Failed to create workspace");
}

// /api/auth/me's businesses list omits currency (Prompt 2 never needed it);
// fetching the single-business detail route is simpler than adding it there.
export async function getBusinessDetailAction(id: string): Promise<ActionResult<BusinessDetail>> {
  return callApi(async () => {
    const res = await customerApi.get<BusinessDetail>(`${API_BASE_URL}/api/businesses/${id}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to load workspace");
}

// pin: null removes the lock.
export async function updateBusinessAction(id: string, input: Partial<Omit<CreateBusinessInput, "pin">> & { pin?: string | null }): Promise<ActionResult> {
  return callApi(async () => {
    // A new PIN locks every other device, not the one that set it.
    const res = await customerApi.patch<WithUnlock>(`${API_BASE_URL}/api/businesses/${id}`, input, { headers: await authHeaders() });
    await keepUnlock(id, res.data);
  }, "Failed to update workspace");
}

export async function deleteBusinessAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/businesses/${id}`, { headers: await authHeaders() });
  }, "Failed to delete workspace");
}

// Settings > Workspaces list page -- the richer list-item shape (phone,
// email, hasPinLock, trialEndsAt, monthlyFee) that /api/auth/me's embedded
// businesses array doesn't carry.
export async function listBusinessesAction(): Promise<ActionResult<WorkspaceListItem[]>> {
  return callApi(async () => {
    const res = await customerApi.get<WorkspaceListItem[]>(`${API_BASE_URL}/api/businesses`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to load workspaces");
}

// A correct PIN opens the workspace on this device for the next 12 hours.
export async function verifyBusinessPinAction(businessId: string, pin: string): Promise<ActionResult<{ valid: boolean }>> {
  return callApi(async () => {
    const res = await customerApi.post<{ valid: boolean } & WithUnlock>(
      `${API_BASE_URL}/api/businesses/${businessId}/verify-pin`,
      { pin },
      { headers: await authHeaders() },
    );
    return keepUnlock(businessId, res.data);
  }, "Failed to verify PIN");
}

// "Forgot PIN?": the owner's account password removes the lock.
export async function resetBusinessPinAction(businessId: string, password: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.post(`${API_BASE_URL}/api/businesses/${businessId}/reset-pin`, { password }, { headers: await authHeaders() });
    await clearWorkspaceUnlock(businessId);
  }, "Failed to remove the PIN");
}

// "Lock now": forgets this device's unlock, so the PIN is asked again.
export async function lockWorkspaceAction(businessId: string): Promise<void> {
  await clearWorkspaceUnlock(businessId);
}

// A Server Action wrapper around lib/businesses.ts's cached fetcher -- Client
// Components (like CreateWorkspaceModal, which needs a fresh count each time
// it opens) can't call a plain server-only function directly, only a real
// Server Action. Like every action it never throws: the reader throws on an
// outage (for the error screen), but the modal calling this has nothing to
// catch it with, so an outage reads as "limits unknown" here.
export async function getBusinessLimitsAction(): Promise<BusinessLimits | null> {
  try {
    return await getBusinessLimits();
  } catch {
    return null;
  }
}
