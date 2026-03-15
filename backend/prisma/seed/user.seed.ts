import { Prisma } from "@prisma/client";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";

export const userSeed: Prisma.UserCreateInput[] = [
  {
    username: "Usuario 1",
    id: createTestId(TableNameEnum.User, 1),
  },
  {
    username: "Usuario 2",
    id: createTestId(TableNameEnum.User, 2),
  },
];
