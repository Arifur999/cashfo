import "server-only";
import axios from "axios";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { logServiceError } from "@/lib/axios/logServiceError";
import type { ICustomerSignInResponse, IRegisterPayload } from "@/types/auth.types";

// server-only, not "use server": the answer carries the new account's tokens.
// The backend creates the account and its first workspace, then signs it in.
// Gives up after 30 seconds, like every other call to the API, so a wedged
// API ends in "Unable to reach the server" instead of a busy button.
export const register = async (payload: IRegisterPayload): Promise<ICustomerSignInResponse> => {
  try {
    const response = await axios.post<ICustomerSignInResponse>(`${API_BASE_URL}/api/auth/register`, payload, {
      headers: await getClientHeaders(),
      timeout: 30_000,
    });
    return response.data;
  } catch (error) {
    logServiceError("Error creating an account", error);
    throw error;
  }
};
