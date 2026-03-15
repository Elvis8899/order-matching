import "@shared/utils/config/dotenv";
import { get } from "env-var";

export const authConfig = {
  secret: get("JWT_SECRET_KEY").default("default-secret").asString(),
  refreshSecret: get("JWT_REFRESH_SECRET")
    .default("default-refresh-secret")
    .asString(),
  audience: get("JWT_TOKEN_AUDIENCE").default("default-audience").asString(),
  issuer: get("JWT_TOKEN_ISSUER").default("default-issuer").asString(),
  accessTokenTtl: get("JWT_ACCESS_TOKEN_TTL").default(3600).asInt(),
  refreshTokenTtl: get("JWT_REFRESH_TOKEN_TTL").default(86400).asInt(),
};
