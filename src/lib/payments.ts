import axios from "axios";
import { API_BASE_URL, type ListPaymentsResponse, type PaymentDetail } from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getPayments(queryString: string): Promise<ListPaymentsResponse> {
  const response = await axios.get<ListPaymentsResponse>(`${API_BASE_URL}/admin/payments?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getFailedPayments(queryString: string): Promise<ListPaymentsResponse> {
  const response = await axios.get<ListPaymentsResponse>(`${API_BASE_URL}/admin/payments/failed?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getPaymentById(id: string): Promise<PaymentDetail | null> {
  try {
    const response = await axios.get<PaymentDetail>(`${API_BASE_URL}/admin/payments/${id}`, {
      headers: await authHeaders(),
    });
    return response.data;
  } catch {
    return null;
  }
}
