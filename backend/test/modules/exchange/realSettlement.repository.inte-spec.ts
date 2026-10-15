import { RealSettlementRepository } from "@exchange/database/realSettlement.repository";
import {
  Settlement,
  SettlementRepository,
} from "@exchange/database/settlement.repository.port";
import { OrderChangedException } from "@exchange/domain/exchange.errors";
import { OrderStatusEnum } from "@exchange/domain/order.entity";
import { InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";
import { executeTask } from "@shared/utils/application/executeTask";
import { MatchBuilder } from "@test/dataBuilders/matchBuilder";
import { OrderBuilder } from "@test/dataBuilders/orderBuilder";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { WalletBuilder } from "@test/dataBuilders/walletBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { IntegrationModule } from "@test/util/defaultModule.inte";
import { RealUserRepository } from "@user/database/realUser.repository";
import { UserRepository } from "@user/database/user.repository.port";

const inteM = new IntegrationModule(
  [
    PrismaService,
    { provide: UserRepository, useClass: RealUserRepository },
    { provide: SettlementRepository, useClass: RealSettlementRepository },
  ],
  (app) => ({
    userRepository: app.get(UserRepository),
    prismaService: app.get(PrismaService),
    settlementRepository: app.get(SettlementRepository),
  }),
);

const buyer = new UserBuilder().build();
const seller = new UserBuilder(1).build();

beforeAll(async () => {
  await inteM.init();
  await inteM.r.prismaService.user.deleteMany({});
  await executeTask(inteM.r.userRepository.save(buyer));
  await executeTask(inteM.r.userRepository.save(seller));
});

afterAll(async () => {
  await inteM.r.prismaService.user.deleteMany({});
  await inteM.r.prismaService.$disconnect();
});

describe("[Integration] Settlement repository", () => {
  const prisma = () => inteM.r.prismaService;
  const buyOrder = new OrderBuilder()
    .withId(createTestId(TableNameEnum.Order, 0))
    .withUserId(buyer.id)
    .withAmount(2)
    .build();
  const sellOrder = new OrderBuilder()
    .withId(createTestId(TableNameEnum.Order, 1))
    .withUserId(seller.id)
    .build();
  const buyerWallet = new WalletBuilder().withId(buyer.id).build();
  const sellerWallet = new WalletBuilder().withId(seller.id).build();

  // The sell order fills half of the buy order at 100 USD
  const settlement = (): Settlement => ({
    orders: [
      {
        order: { ...buyOrder, filled: 1 },
        readFilled: 0,
      },
      {
        order: { ...sellOrder, filled: 1, status: OrderStatusEnum.Complete },
        readFilled: 0,
      },
    ],
    wallets: [
      { ...buyerWallet, btc: 1, usd: -0.3 },
      { ...sellerWallet, btc: 0, usd: 99.5 },
    ],
    // Its default ids are these orders and users
    matches: [new MatchBuilder().build()],
  });

  const stored = async () => ({
    orders: await prisma().order.findMany({
      select: { id: true, filled: true, status: true },
      orderBy: { id: "asc" },
    }),
    wallets: await prisma().wallet.findMany({
      select: { id: true, btc: true, usd: true },
      orderBy: { id: "asc" },
    }),
    matches: await prisma().match.count(),
  });

  beforeEach(async () => {
    await prisma().match.deleteMany();
    await prisma().order.deleteMany();
    await prisma().wallet.deleteMany();
    await prisma().order.createMany({ data: [buyOrder, sellOrder] });
    await prisma().wallet.createMany({ data: [buyerWallet, sellerWallet] });
  });

  afterEach(async () => {
    await prisma().match.deleteMany();
    await prisma().order.deleteMany();
    await prisma().wallet.deleteMany();
  });

  it("Should fill the orders, move the funds and store the matches", async () => {
    await executeTask(inteM.r.settlementRepository.settle(settlement()));

    expect(await stored()).toEqual({
      orders: [
        { id: buyOrder.id, filled: 1, status: OrderStatusEnum.Active },
        { id: sellOrder.id, filled: 1, status: OrderStatusEnum.Complete },
      ],
      wallets: [
        { id: buyer.id, btc: buyerWallet.btc + 1, usd: buyerWallet.usd - 0.3 },
        { id: seller.id, btc: sellerWallet.btc, usd: sellerWallet.usd + 99.5 },
      ],
      matches: 1,
    });
  });

  it.each([
    ["was cancelled", { status: OrderStatusEnum.Cancelled }],
    ["was filled meanwhile", { filled: 0.5 }],
  ])("Should save nothing if an order %s", async (_, change) => {
    await prisma().order.update({ where: { id: sellOrder.id }, data: change });
    const before = await stored();

    await expect(
      executeTask(inteM.r.settlementRepository.settle(settlement())),
    ).rejects.toThrow(OrderChangedException);

    expect(await stored()).toEqual(before);
  });

  it("Should roll back the orders when a later write fails", async () => {
    const before = await stored();
    const unknownUser = createTestId(TableNameEnum.User, 9);
    const withUnknownWallet = settlement();
    withUnknownWallet.wallets.push({ ...buyerWallet, id: unknownUser });

    await expect(
      executeTask(inteM.r.settlementRepository.settle(withUnknownWallet)),
    ).rejects.toThrow(InternalServerErrorException);

    expect(await stored()).toEqual(before);
  });
});
