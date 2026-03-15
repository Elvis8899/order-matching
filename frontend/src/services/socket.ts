import { io } from "socket.io-client";

const TOKEN_KEY = "exchange_token";

// "undefined" means the URL will be computed from the `window.location` object
const URL =
  process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000";

export const socket = io(URL, {
  path: "/v1/socket.io",
  autoConnect: false,
  auth: {
    authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
  },
});
