import "@shared/utils/config/dotenv";

/**
 * Parses TRUST_PROXY for Fastify's trustProxy option: unset or "false"
 * ignores forwarded headers, "true" trusts any proxy, and a comma-separated
 * list trusts only those proxy IPs/CIDRs (e.g. "172.18.0.0/16").
 */
export const parseTrustProxy = (
  value: string | undefined,
): boolean | string[] => {
  const normalized = value?.trim() ?? "";
  if (normalized === "" || normalized === "false") return false;
  if (normalized === "true") return true;
  return normalized
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
};

export const envConfig = {
  isProduction: process.env.NODE_ENV === "production",
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
};
