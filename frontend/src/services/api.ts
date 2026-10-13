import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { Credentials, CredentialsStorage } from "@/services/credentials";

export const API_URL = "http://localhost:3000/v1";

const http = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

http.interceptors.request.use(async (config) => {
  const token = CredentialsStorage.getAccessToken();
  if (token) {
    config.headers["authorization"] = `Bearer ${token}`;
  }
  return config;
});

// Called when the refresh token is rejected and the user has to log in again
type Listener = () => void;
const sessionExpiredListeners = new Set<Listener>();
export function onSessionExpired(fn: Listener): () => void {
  sessionExpiredListeners.add(fn);
  return () => sessionExpiredListeners.delete(fn);
}

async function exchangeRefreshToken(
  staleAccessToken: string | null,
): Promise<string | null> {
  // Another request or tab already refreshed: use its token. Sending the old
  // refresh token again would revoke the session.
  const current = CredentialsStorage.getAccessToken();
  if (current && current !== staleAccessToken) return current;

  const refreshToken = CredentialsStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<Credentials>(`${API_URL}/refresh`, {
      refreshToken,
    });
    CredentialsStorage.save(data);
    return data.accessToken;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      CredentialsStorage.clear();
      sessionExpiredListeners.forEach((fn) => fn());
    }
    return null;
  }
}

let pendingRefresh: Promise<string | null> | null = null;

/**
 * Exchanges the refresh token for new tokens and returns the new access
 * token, or null when the session is over. Refresh tokens are single-use, so
 * one refresh runs at a time: calls in this tab share it, and tabs take turns
 * through the Web Locks API.
 */
export function refreshAccessToken(
  staleAccessToken: string | null,
): Promise<string | null> {
  const run = () => exchangeRefreshToken(staleAccessToken);
  pendingRefresh ??= (
    navigator.locks
      ? navigator.locks.request("exchange-token-refresh", run)
      : run()
  ).finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

const authRoutes = ["/login", "/refresh"];

// On a 401, refresh the tokens once and retry the request
http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as
    | (InternalAxiosRequestConfig & { retried?: boolean })
    | undefined;
  if (
    error.response?.status !== 401 ||
    !config ||
    config.retried ||
    authRoutes.includes(config.url ?? "")
  ) {
    throw error;
  }
  config.retried = true;
  const sentToken =
    (config.headers["authorization"] as string | undefined)?.replace(
      /^Bearer /,
      "",
    ) ?? null;
  const token = await refreshAccessToken(sentToken);
  if (!token) throw error;
  return http(config);
});

export { http };
