import { JwtModuleOptions } from "@nestjs/jwt";
import "@shared/utils/config/dotenv";
import { get } from "env-var";

const MIN_SECRET_LENGTH = 32;

export const getSecret = (name: string): string => {
  const secret = get(name).required().asString();
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${name} must be at least ${String(MIN_SECRET_LENGTH)} characters long`,
    );
  }
  return secret;
};

export const authConfig = {
  secret: getSecret("JWT_SECRET_KEY"),
  refreshSecret: getSecret("JWT_REFRESH_SECRET"),
  audience: get("JWT_TOKEN_AUDIENCE").default("default-audience").asString(),
  issuer: get("JWT_TOKEN_ISSUER").default("default-issuer").asString(),
  accessTokenTtl: get("JWT_ACCESS_TOKEN_TTL").default(3600).asInt(),
  refreshTokenTtl: get("JWT_REFRESH_TOKEN_TTL").default(86400).asInt(),
  // Login attempts allowed per client IP and username within the window
  loginRateLimit: get("LOGIN_RATE_LIMIT").default(10).asIntPositive(),
  loginRateWindowSeconds: get("LOGIN_RATE_WINDOW_SECONDS")
    .default(60)
    .asIntPositive(),
};

// Options for JwtModule: access tokens are signed and verified with the
// configured audience and issuer (refresh tokens use their own options)
export const jwtModuleOptions = (): JwtModuleOptions => ({
  secret: authConfig.secret,
  signOptions: {
    audience: authConfig.audience,
    issuer: authConfig.issuer,
    expiresIn: authConfig.accessTokenTtl,
  },
  verifyOptions: {
    audience: authConfig.audience,
    issuer: authConfig.issuer,
  },
});
