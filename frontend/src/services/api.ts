import axios from "axios";

const TOKEN_KEY = "exchange_token";

const http = axios.create({
  baseURL: "http://localhost:3000/v1",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

http.interceptors.request.use(async (config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers["authorization"] = `Bearer ${token}`;
  }
  return config;
});
export { http };
