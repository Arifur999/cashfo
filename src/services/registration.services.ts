import "server-only";
import axios from "axios";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { logServiceError } from "@/lib/axios/logServiceError";
import type { ICustomerSignInResponse, IRegisterPayload } from "@/types/auth.types";

// server-only, not "use server": the answer carries the new account's tokens.
// The backend creates the account and its first workspace, then signs it in.
export const register = async (payload: IRegisterPayload): Promise<ICustomerSignInResponse> => {
  try {
    const response = await axios.post<ICustomerSignInResponse>(`${API_BASE_URL}/api/auth/register`, payload, {
      headers: await getClientHeaders(),
    });
    return response.data;
  } catch (error) {
    logServiceError("Error creating an account", error);
    throw error;
  }
};
