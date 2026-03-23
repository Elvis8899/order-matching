import { InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";
import {
  executeTask,
  executeTasks,
} from "@shared/utils/application/executeTask";
import { RealWalletRepository } from "@src/modules/exchange/database/realWallet.repository";
import { WalletRepository } from "@src/modules/exchange/database/wallet.repository.port";
import { RealUserRepository } from "@src/modules/user/database/realUser.repository";
import { UserRepository } from "@src/modules/user/database/user.repository.port";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { WalletBuilder } from "@test/data-builders/walletBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { IntegrationModule } from "@test/util/defaultModule.inte";
import { TestHelper } from "@test/util/testHelper";

const inteM = new IntegrationModule(
  [
    PrismaService,
    { provide: UserRepository, useClass: RealUserRepository },
    { provide: WalletRepository, useClass: RealWalletRepository },
  ],
  (app) => ({
    userRepository: app.get(UserRepository),
    prismaService: app.get(PrismaService),
    walletRepository: app.get(WalletRepository),
  }),
);
beforeAll(async () => {
  await inteM.init();
  await inteM.r.prismaService.user.deleteMany({});
  await executeTask(inteM.r.userRepository.save(new UserBuilder().build()));
});

afterAll(async () => {
  await inteM.r.prismaService.$disconnect();
});

describe("[Integration] Wallet repository", () => {
  const walletBuilder = new WalletBuilder();

  beforeEach(async () => {
    await inteM.r.prismaService.wallet.deleteMany();
  });

  afterEach(async () => {
    await inteM.r.prismaService.wallet.deleteMany();
    walletBuilder.reset();
  });

  it("Successfully get wallet after save", async () => {
    //Given an existing wallet in database

    const wallet = walletBuilder.build();
    await executeTask(inteM.r.walletRepository.save(wallet));

    // Should be able to retrieve it

    const [resultById, resultPaginated, resultAll] = await executeTasks(
      inteM.r.walletRepository.findById(wallet.id),
      inteM.r.walletRepository.findAllPaginated({
        page: 0,
        limit: 10,
      }),
      inteM.r.walletRepository.findAll(),
    );

    const expectSomeWallet = TestHelper.expectSome(wallet);

    expectSomeWallet(resultById);
    expect(resultPaginated.count).toBe(1);
    expect(resultPaginated.data.length).toBe(1);
    expect(resultAll.length).toBe(1);
  });

  it("Successfully get wallet after save with pagination", async () => {
    //Given two existing wallet in database

    const walletA = walletBuilder.build();
    const walletB = walletBuilder
      .withId(createTestId(TableNameEnum.Wallet, 1))
      .build();
    const userB = new UserBuilder(1).build();
    await executeTask(inteM.r.userRepository.save(userB));
    await executeTasks(
      inteM.r.walletRepository.save(walletA),
      inteM.r.walletRepository.save(walletB),
    );

    // Should be able to retrieve it

    const [resultPaginated] = await executeTasks(
      inteM.r.walletRepository.findAllPaginated({
        page: 1,
        limit: 1,
      }),
    );

    expect(resultPaginated.count).toBe(2);
    expect(resultPaginated.data.length).toBe(1);
  });

  it("Successfully delete wallet after save", async () => {
    //Given an inexisting wallet in database
    const wallet = walletBuilder.build();

    await executeTask(inteM.r.walletRepository.save(wallet));

    //When we delete him

    await executeTask(inteM.r.walletRepository.deleteById(wallet.id));
    //Then we should have deleted him
    const savedWallets = await inteM.r.prismaService.wallet.findMany({});

    expect(savedWallets.length).toBe(0);
  });

  it("Should not delete wallet with wrong id", async () => {
    //Given an existing wallet in database
    const wallet = walletBuilder.build();

    await executeTask(inteM.r.walletRepository.save(wallet));

    //When we try deleting with wrong wallet id

    const resultPromise = executeTask(
      inteM.r.walletRepository.deleteById(createTestId(TableNameEnum.None, 0)),
    );
    //Then we should not have deleted him
    await expect(resultPromise).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    const savedWallets = await inteM.r.prismaService.wallet.findMany({});

    expect(savedWallets.length).toBe(1);
  });

  it("Return null when there is no wallet", async () => {
    //Given no existing wallets in database
    const unsavedWallet = walletBuilder
      .withId(createTestId(TableNameEnum.None, 0))
      .build();

    //When we try to retrieve
    const [resultById, resultPaginated, resultAll] = await executeTasks(
      inteM.r.walletRepository.findById(unsavedWallet.id),
      inteM.r.walletRepository.findAllPaginated({
        page: 0,
        limit: 10,
      }),
      inteM.r.walletRepository.findAll(),
    );

    TestHelper.expectNone(resultById);
    expect(resultPaginated.count).toBe(0);
    expect(resultPaginated.data.length).toBe(0);
    expect(resultAll.length).toBe(0);
  });
});
