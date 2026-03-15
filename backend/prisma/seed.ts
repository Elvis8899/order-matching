import { PrismaClient } from "@prisma/client";
import { userSeed } from "./seed/user.seed";

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);
  await Promise.all(userSeed.map((data) => prisma.user.create({ data })));

  console.log(`Created users`);

  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
