import { BaseDateEntity } from "@shared/utils/domain/dateEntity.base";
import { UUID } from "@shared/uuid/entities/uuid";
import { z } from "zod";

export enum UserRoleEnum {
  Admin = "admin",
  Client = "client",
}

export const User = z
  .object({
    id: UUID,
    username: z.string().min(1),
    // bcrypt hash; plain passwords are validated by Password
    password: z.string(),
    role: z.enum(UserRoleEnum).default(UserRoleEnum.Client),
    tokenVersion: z.number().int().min(0).default(0),
  })
  .and(BaseDateEntity);

export type User = z.infer<typeof User>;

export const Password = z.string().min(8).max(72);

// Who is making a request, as the access token says
export type Requester = {
  id: string;
  role: UserRoleEnum;
};

export const isAdmin = (requester: Requester): boolean =>
  requester.role === UserRoleEnum.Admin;

// Users may read and change their own account; admins any account
export const canManageUser = (requester: Requester, userId: string): boolean =>
  isAdmin(requester) || requester.id === userId;
