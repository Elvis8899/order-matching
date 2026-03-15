import { authConfig } from "@auth/auth.config";
import { JwtSignOptions } from "@nestjs/jwt";

export const getSignTokenParams = (
  sub: string,
  payload: object,
): {
  payload: object;
  signOptions: JwtSignOptions;
  refreshOptions: JwtSignOptions;
} => {
  return {
    payload: {
      sub,
      ...payload,
    },
    signOptions: {
      audience: authConfig.audience,
      issuer: authConfig.issuer,
      secret: authConfig.secret,
      expiresIn: authConfig.accessTokenTtl,
    },
    refreshOptions: {
      audience: authConfig.audience,
      issuer: authConfig.issuer,
      secret: authConfig.refreshSecret,
      expiresIn: authConfig.refreshTokenTtl,
    },
  };
};
