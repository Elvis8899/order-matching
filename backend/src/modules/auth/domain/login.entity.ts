import { z } from "zod";

export const LoginInput = z.object({
  username: z.string().min(1),
});

export type User = z.infer<typeof LoginInput>;

export type RequestJWTPayload = {
  sub: string;
  username: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
};

export type AuthenticatedRequest = {
  user: RequestJWTPayload;
};
