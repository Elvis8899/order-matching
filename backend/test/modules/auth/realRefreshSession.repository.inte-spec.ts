import { RealRefreshSessionRepository } from "@auth/database/realRefreshSession.repository";
import { RefreshSession } from "@auth/domain/refreshSession.entity";
import { Test } from "@nestjs/testing";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";
import { executeTask } from "@shared/utils/application/executeTask";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";

let prismaService: PrismaService;
let refreshSessionRepository: RealRefreshSessionRepository;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    providers: [RealRefreshSessionRepository, PrismaService],
  }).compile();

  refreshSessionRepository = module.get(RealRefreshSessionRepository);
  prismaService = module.get<PrismaService>(PrismaService);
});

afterAll(async () => {
  await prismaService.$disconnect();
});

describe("[Integration] Refresh session repository", () => {
  const user = new UserBuilder().build();
  const tomorrow = () => new Date(Date.now() + 86400 * 1000);
  const yesterday = () => new Date(Date.now() - 86400 * 1000);
  const session = (n: number, expiresAt = tomorrow()): RefreshSession => ({
    id: createTestId(TableNameEnum.RefreshSession, n),
    userId: user.id,
    currentJti: createTestId(TableNameEnum.None, n),
    expiresAt,
  });
  const storedIds = async () =>
    (
      await prismaService.refreshSession.findMany({ orderBy: { id: "asc" } })
    ).map((s) => s.id);

  beforeEach(async () => {
    // Sessions are removed with their user
    await prismaService.user.deleteMany();
    await prismaService.user.create({ data: user });
  });

  afterAll(async () => {
    await prismaService.user.deleteMany();
  });

  it("Should rotate the session only from its current jti", async () => {
    //Given a stored session
    const stored = session(1);
    await executeTask(refreshSessionRepository.create(stored));
    const newJti = createTestId(TableNameEnum.None, 2);
    const expiresAt = tomorrow();

    //When its current token is used, then used again
    const first = await executeTask(
      refreshSessionRepository.rotate({
        id: stored.id,
        jti: stored.currentJti,
        newJti,
        expiresAt,
      }),
    );
    const reuse = await executeTask(
      refreshSessionRepository.rotate({
        id: stored.id,
        jti: stored.currentJti,
        newJti: createTestId(TableNameEnum.None, 3),
        expiresAt,
      }),
    );

    //Then only the first use rotates it
    expect(first).toBe(true);
    expect(reuse).toBe(false);
    const updated = await prismaService.refreshSession.findUnique({
      where: { id: stored.id },
    });
    expect(updated?.currentJti).toBe(newJti);
    expect(updated?.expiresAt).toEqual(expiresAt);
  });

  it("Should delete a session, even if it no longer exists", async () => {
    await executeTask(refreshSessionRepository.create(session(1)));

    await executeTask(refreshSessionRepository.deleteById(session(1).id));
    await executeTask(refreshSessionRepository.deleteById(session(1).id));

    expect(await storedIds()).toEqual([]);
  });

  it("Should delete only the user's expired sessions", async () => {
    await executeTask(refreshSessionRepository.create(session(1, yesterday())));
    await executeTask(refreshSessionRepository.create(session(2)));

    await executeTask(refreshSessionRepository.deleteExpired(user.id));

    expect(await storedIds()).toEqual([session(2).id]);
  });

  it("Should fail to create a session for an unknown user", async () => {
    await expect(
      executeTask(
        refreshSessionRepository.create({
          ...session(1),
          userId: createTestId(TableNameEnum.User, 99),
        }),
      ),
    ).rejects.toBeInstanceOf(Error);
  });
});
