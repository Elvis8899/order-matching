import { UUID } from "@shared/uuid/entities/uuid";
import { Requester, UserRoleEnum } from "@user/domain/user.entity";
import { z } from "zod";

export const LoginInput = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof LoginInput>;

export const RefreshTokenInput = z.object({
  refreshToken: z.string().min(1),
});

export type RequestJWTPayload = {
  sub: string;
  username: string;
  role: UserRoleEnum;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
};

// Claims of a verified refresh token that refreshing relies on
export const RefreshTokenClaims = z.object({
  sub: UUID,
  ver: z.number().int(),
  sid: UUID,
  jti: UUID,
});

export type RefreshTokenClaims = z.infer<typeof RefreshTokenClaims>;

export type AuthenticatedRequest = {
  user: RequestJWTPayload;
};

export const toRequester = ({ sub, role }: RequestJWTPayload): Requester => ({
  id: sub,
  role,
});
