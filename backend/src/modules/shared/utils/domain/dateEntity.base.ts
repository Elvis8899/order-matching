import { DateType } from "@shared/utils/domain/DateType";
import { z } from "zod";

export const BaseDateEntity = z.object({
  createdAt: DateType.default(() => new Date()),
  updatedAt: DateType.default(() => new Date()),
});

export type BaseDateEntity = z.infer<typeof BaseDateEntity>;
