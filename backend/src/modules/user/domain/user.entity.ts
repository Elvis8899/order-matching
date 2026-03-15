import { BaseDateEntity } from "@shared/utils/domain/dateEntity.base";
import { UUID } from "@shared/uuid/entities/uuid";
import { z } from "zod";

export const User = z
  .object({
    id: UUID,
    username: z.string().min(1),
  })
  .and(BaseDateEntity);

export type User = z.infer<typeof User>;
