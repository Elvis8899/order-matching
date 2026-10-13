import { User } from "@/lib/types";

export const USER_KEY = "exchange_user";
const TOKEN_KEY = "exchange_token";
const REFRESH_TOKEN_KEY = "exchange_refresh_token";

export interface Credentials {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// The session lives in localStorage, so every tab shares it
export const CredentialsStorage = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  getUser(): User | null {
    const data = localStorage.getItem(USER_KEY);
    return data ? (JSON.parse(data) as User) : null;
  },
  save({ accessToken, refreshToken, user }: Credentials) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
