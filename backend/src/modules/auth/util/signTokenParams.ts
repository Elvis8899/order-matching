import { authConfig } from "@auth/auth.config";
import { AuthResponseDto } from "@auth/dtos/authResponse.dto";
import { JwtService, JwtSignOptions, JwtVerifyOptions } from "@nestjs/jwt";
import { User } from "@user/domain/user.entity";

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

export const refreshVerifyOptions: JwtVerifyOptions = {
  audience: authConfig.audience,
  issuer: authConfig.issuer,
  secret: authConfig.refreshSecret,
};

/** Identifies the refresh token to issue: its session and its jti. */
export type RefreshTokenRef = { sessionId: string; jti: string };

/** Expiration of a refresh session issued or rotated now. */
export const refreshSessionExpiry = (): Date =>
  new Date(Date.now() + authConfig.refreshTokenTtl * 1000);

export const generateTokens =
  (jwtService: JwtService) =>
  async (
    user: User,
    { sessionId, jti }: RefreshTokenRef,
  ): Promise<AuthResponseDto> => {
    const { payload, signOptions, refreshOptions } = getSignTokenParams(
      user.id,
      {
        username: user.username,
        role: user.role,
      },
    );
    const [accessToken, refreshToken] = await Promise.all([
      jwtService.signAsync(payload, signOptions),
      // The token version lets the server revoke all the user's refresh
      // tokens; the session and jti make each refresh token single-use
      jwtService.signAsync(
        { ...payload, ver: user.tokenVersion, sid: sessionId, jti },
        refreshOptions,
      ),
    ]);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  };
