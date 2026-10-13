import { Prisma } from "@prisma/client";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";

// Plain passwords; seed.ts hashes them
export const userSeed: Prisma.UserCreateInput[] = [
  {
    username: "admin",
    password: "admin123",
    role: "admin",
    id: createTestId(TableNameEnum.User, 1),
  },
  {
    username: "cliente",
    password: "cliente123",
    role: "client",
    id: createTestId(TableNameEnum.User, 2),
    wallet: { create: { btc: 100, usd: 100000 } },
  },
];
