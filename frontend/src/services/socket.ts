import { io } from "socket.io-client";
import { CredentialsStorage } from "@/services/credentials";

// "undefined" means the URL will be computed from the `window.location` object
const URL =
  process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000";

export const socket = io(URL, {
  path: "/v1/socket.io",
  autoConnect: false,
  // Read on every (re)connection, so it sends the current access token
  auth: (cb) => cb({ token: CredentialsStorage.getAccessToken() }),
});
