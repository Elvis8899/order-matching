import {
  FindMatch,
  FindMatchHandler,
} from "@exchange/commands/findMatch/findMatch.command";
import { FakeMatchRepository } from "@exchange/database/fakeMatch.repository";
import { FakeOrderRepository } from "@exchange/database/fakeOrder.repository";
import { FakeSettlementRepository } from "@exchange/database/fakeSettlement.repository";
import { FakeWalletRepository } from "@exchange/database/fakeWallet.repository";
import { MatchRepository } from "@exchange/database/match.repository.port";
import { OrderRepository } from "@exchange/database/order.repository.port";
import { SettlementRepository } from "@exchange/database/settlement.repository.port";
import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { OrderChangedException } from "@exchange/domain/exchange.errors";
import {
  MATCH_MAKER_FEE,
  MATCH_TAKER_FEE,
} from "@exchange/domain/match.entity";
import {
  Order,
  OrderSideEnum,
  OrderStatusEnum,
} from "@exchange/domain/order.entity";
import { DomainEventPublisher } from "@shared/domainEventPublisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domainEventPublisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { A, FPF, TE } from "@shared/utils/application/monads";
import { OrderBuilder } from "@test/dataBuilders/orderBuilder";
import { WalletBuilder } from "@test/dataBuilders/walletBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UnitModule } from "@test/util/defaultModule.unit";

//Adapters

describe("[Unit] Find Match", () => {
  const oldOrderBuilder = new OrderBuilder();
  const modRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        FindMatchHandler,
        { provide: WalletRepository, useClass: FakeWalletRepository },
        { provide: OrderRepository, useClass: FakeOrderRepository },
        { provide: MatchRepository, useClass: FakeMatchRepository },
        { provide: SettlementRepository, useClass: FakeSettlementRepository },
      ],
    },
    (ref) => ({
      walletRepository: ref.get(WalletRepository),
      orderRepository: ref.get(OrderRepository),
      matchRepository: ref.get(MatchRepository),
      findMatchHandler: ref.get(FindMatchHandler),
      eventPublisher: ref.get(DomainEventPublisher),
    }),
  );

  const defaultWalletA = new WalletBuilder().build();
  const defaultWalletB = new WalletBuilder(1).build();
  beforeEach(async () => {
    await modRef.init();

    await executeTask(
      A.sequence(TE.ApplicativePar)([
        modRef.r.walletRepository.save(defaultWalletA),
        modRef.r.walletRepository.save(defaultWalletB),
      ]),
    );
  });

  it("Should create match if new order matches an existing order - BUY", async () => {
    // Given an valid BUY order on the database
    const oldOrder = oldOrderBuilder.withSide(OrderSideEnum.Buy).build();
    await executeTask(modRef.r.orderRepository.save(oldOrder));
    // Given a valid SELL order
    const newOrder = new OrderBuilder(1)
      .withSide(OrderSideEnum.Sell)
      .withUserId(defaultWalletB.id)
      .build();
    // When we create a order
    await executeTask(modRef.r.orderRepository.save(newOrder));

    // And we try to find a match
    const resultPromise = modRef.r.findMatchHandler.execute(
      new FindMatch(newOrder),
    );

    // Then it should have created a match
    await expect(resultPromise).resolves.toEqual(undefined);

    const matches = await executeTask(modRef.r.matchRepository.findAll());
    expect(matches.length).toEqual(1);

    // And  it should have updated users wallet
    const wallets = await executeTask(modRef.r.walletRepository.findAll());
    const walletUSDAmounts = wallets.map((w) => w.usd);
    const walletBTCAmounts = wallets.map((w) => w.btc);
    const matchVolume = oldOrder.amount * oldOrder.price;
    // Seller pays MAKER_FEE Since his order is older
    const makerDiff = matchVolume * (-1 * MATCH_MAKER_FEE);
    // Buyer receives 100% - TAKER_FEE Since his order is newer
    const takerDiff = matchVolume * (1 - MATCH_TAKER_FEE);
    const matchAmount = oldOrder.amount;
    const expectedUSDAmounts = [
      defaultWalletA.usd + makerDiff,
      defaultWalletB.usd + takerDiff,
    ];
    const expectedBTCAmounts = [
      defaultWalletA.btc + matchAmount,
      defaultWalletB.btc,
    ];
    expect(walletUSDAmounts).toEqual(expectedUSDAmounts);
    expect(walletBTCAmounts).toEqual(expectedBTCAmounts);

    // And orders should be Completed
    const orders = await executeTask(
      modRef.r.orderRepository.findAll({
        query: { status: OrderStatusEnum.Complete },
      }),
    );
    expect(orders.length).toEqual(2);
  });

  it("Should create match if new order matches an existing order - Sell", async () => {
    // Given an valid BUY order on the database
    const oldOrder = oldOrderBuilder
      .withSide(OrderSideEnum.Sell)
      .withUserId(defaultWalletA.id)
      .build();
    await executeTask(modRef.r.orderRepository.save(oldOrder));
    // Given a valid Buy order
    const newOrder = new OrderBuilder(1)
      .withSide(OrderSideEnum.Buy)
      .withUserId(defaultWalletB.id)
      .build();
    // When we create a order
    await executeTask(modRef.r.orderRepository.save(newOrder));

    // And we try to find a match
    const resultPromise = modRef.r.findMatchHandler.execute(
      new FindMatch(newOrder),
    );

    // Then it should have created a match
    await expect(resultPromise).resolves.toEqual(undefined);

    const matches = await executeTask(modRef.r.matchRepository.findAll());
    expect(matches.length).toEqual(1);

    // And  it should have updated users wallet
    const wallets = await executeTask(modRef.r.walletRepository.findAll());
    const walletUSDAmounts = wallets.map((w) => w.usd);
    const walletBTCAmounts = wallets.map((w) => w.btc);
    const matchVolume = oldOrder.amount * oldOrder.price;
    // Seller pays MAKER_FEE Since his order is older
    const makerDiff = matchVolume * (1 - MATCH_MAKER_FEE);
    // Buyer receives 100% - TAKER_FEE Since his order is newer
    const takerDiff = matchVolume * (-1 * MATCH_TAKER_FEE);
    const matchAmount = oldOrder.amount;
    const expectedUSDAmounts = [
      defaultWalletA.usd + makerDiff,
      defaultWalletB.usd + takerDiff,
    ];
    const expectedBTCAmounts = [
      defaultWalletA.btc,
      defaultWalletB.btc + matchAmount,
    ];
    expect(walletUSDAmounts).toEqual(expectedUSDAmounts);
    expect(walletBTCAmounts).toEqual(expectedBTCAmounts);

    // And orders should be Completed
    const orders = await executeTask(
      modRef.r.orderRepository.findAll({
        query: { status: OrderStatusEnum.Complete },
      }),
    );
    expect(orders.length).toEqual(2);
  });

  it("Should create match if new order matches multiple existing orders - Buy", async () => {
    // Given an valid Buy order on the database
    const oldOrders = [1, 2, 3].map((amount) =>
      oldOrderBuilder
        .withId(createTestId(TableNameEnum.Order, amount))
        .withSide(OrderSideEnum.Buy)
        .withUserId(defaultWalletA.id)
        .withAmount(amount)
        .build(),
    );
    await Promise.all(
      oldOrders.map((oldOrder) =>
        executeTask(modRef.r.orderRepository.save(oldOrder)),
      ),
    );
    // Given a valid Buy order
    const newOrder = new OrderBuilder(10)
      .withSide(OrderSideEnum.Sell)
      .withUserId(defaultWalletB.id)
      .withAmount(10)
      .build();
    // When we create a order
    await executeTask(modRef.r.orderRepository.save(newOrder));

    // And we try to find a match
    const resultPromise = modRef.r.findMatchHandler.execute(
      new FindMatch(newOrder),
    );

    // Then it should have created a match
    await expect(resultPromise).resolves.toEqual(undefined);

    const matches = await executeTask(modRef.r.matchRepository.findAll());
    expect(matches.length).toEqual(3);

    // And  it should have updated users wallet
    const wallets = await executeTask(modRef.r.walletRepository.findAll());
    const walletUSDAmounts = wallets.map((w) => w.usd);
    const walletBTCAmounts = wallets.map((w) => w.btc);
    const matchVolume = oldOrders
      .map((o) => o.amount * o.price)
      .reduce((acc, o) => acc + o, 0);
    // Seller pays MAKER_FEE Since his order is older
    const makerDiff = matchVolume * (-1 * MATCH_MAKER_FEE);
    // Buyer receives 100% - TAKER_FEE Since his order is newer
    const takerDiff = matchVolume * (1 - MATCH_TAKER_FEE);
    const matchAmount = oldOrders
      .map((o) => o.amount)
      .reduce((acc, o) => acc + o, 0);
    const expectedUSDAmounts = [
      defaultWalletA.usd + makerDiff,
      defaultWalletB.usd + takerDiff,
    ];
    const expectedBTCAmounts = [
      defaultWalletA.btc + matchAmount,
      defaultWalletB.btc,
    ];
    expect(walletUSDAmounts).toEqual(expectedUSDAmounts);
    expect(walletBTCAmounts).toEqual(expectedBTCAmounts);

    // And Sell orders should be Completed
    const orders = await executeTask(
      modRef.r.orderRepository.findAll({
        query: { status: OrderStatusEnum.Complete },
      }),
    );
    expect(orders.length).toEqual(3);

    // And Buy orders should be Active
    const activeOrders = await executeTask(
      modRef.r.orderRepository.findAll({
        query: { status: OrderStatusEnum.Active },
      }),
    );
    expect(activeOrders.length).toEqual(1);
  });

  it("Should create match if new order matches multiple existing orders - Sell", async () => {
    // Given an valid Sell order on the database
    const oldOrders = [1, 2, 3].map((amount) =>
      oldOrderBuilder
        .withId(createTestId(TableNameEnum.Order, amount))
        .withSide(OrderSideEnum.Sell)
        .withUserId(defaultWalletA.id)
        .withAmount(amount)
        .build(),
    );
    await Promise.all(
      oldOrders.map((oldOrder) =>
        executeTask(modRef.r.orderRepository.save(oldOrder)),
      ),
    );
    // Given a valid Buy order
    const newOrder = new OrderBuilder(10)
      .withSide(OrderSideEnum.Buy)
      .withUserId(defaultWalletB.id)
      .withAmount(10)
      .build();
    // When we create a order
    await executeTask(modRef.r.orderRepository.save(newOrder));

    // And we try to find a match
    const resultPromise = modRef.r.findMatchHandler.execute(
      new FindMatch(newOrder),
    );

    // Then it should have created a match
    await expect(resultPromise).resolves.toEqual(undefined);

    const matches = await executeTask(modRef.r.matchRepository.findAll());
    expect(matches.length).toEqual(3);

    // And  it should have updated users wallet
    const wallets = await executeTask(modRef.r.walletRepository.findAll());
    const walletUSDAmounts = wallets.map((w) => w.usd);
    const walletBTCAmounts = wallets.map((w) => w.btc);
    const matchVolume = oldOrders
      .map((o) => o.amount * o.price)
      .reduce((acc, o) => acc + o, 0);
    // Seller pays MAKER_FEE Since his order is older
    const makerDiff = matchVolume * (1 - MATCH_MAKER_FEE);
    // Buyer receives 100% - TAKER_FEE Since his order is newer
    const takerDiff = matchVolume * (-1 * MATCH_TAKER_FEE);
    const matchAmount = oldOrders
      .map((o) => o.amount)
      .reduce((acc, o) => acc + o, 0);
    const expectedUSDAmounts = [
      defaultWalletA.usd + makerDiff,
      defaultWalletB.usd + takerDiff,
    ];
    const expectedBTCAmounts = [
      defaultWalletA.btc,
      defaultWalletB.btc + matchAmount,
    ];
    expect(walletUSDAmounts).toEqual(expectedUSDAmounts);
    expect(walletBTCAmounts).toEqual(expectedBTCAmounts);

    // And Sell orders should be Completed
    const orders = await executeTask(
      modRef.r.orderRepository.findAll({
        query: { status: OrderStatusEnum.Complete },
      }),
    );
    expect(orders.length).toEqual(3);

    // And Buy orders should be Active
    const activeOrders = await executeTask(
      modRef.r.orderRepository.findAll({
        query: { status: OrderStatusEnum.Active },
      }),
    );
    expect(activeOrders.length).toEqual(1);
  });

  it("Should not create order if new order does not match an existing order", async () => {
    // Given a potentially valid order
    const newOrder = new OrderBuilder(1).withUserId(defaultWalletB.id).build();
    // When we create a order
    await executeTask(modRef.r.orderRepository.save(newOrder));

    // And we try to find a match
    const resultPromise = modRef.r.findMatchHandler.execute(
      new FindMatch(newOrder),
    );

    // Then it should not have created a match if it does not match
    await expect(resultPromise).resolves.toEqual(undefined);

    const matches = await executeTask(modRef.r.matchRepository.findAll());
    expect(matches.length).toEqual(0);
  });

  describe("When the trade price is better than the buyer's price", () => {
    const balances = async () =>
      (await executeTask(modRef.r.walletRepository.findAll())).map(
        ({ usd, btc }) => ({ usd, btc }),
      );
    const expectBalances = async (expected: { usd: number; btc: number }[]) => {
      const actual = await balances();
      expected.forEach(({ usd, btc }, i) => {
        expect(actual[i]?.usd).toBeCloseTo(usd, 9);
        expect(actual[i]?.btc).toBeCloseTo(btc, 9);
      });
    };

    it("Should refund the difference to a buyer who takes a cheaper sell", async () => {
      // A sells 1 BTC at 100, then B buys 1 BTC at up to 120
      const sell = oldOrderBuilder
        .withSide(OrderSideEnum.Sell)
        .withPrice(100)
        .build();
      const buy = new OrderBuilder(1)
        .withSide(OrderSideEnum.Buy)
        .withUserId(defaultWalletB.id)
        .withPrice(120)
        .build();
      await executeTask(modRef.r.orderRepository.save(sell));
      await executeTask(modRef.r.orderRepository.save(buy));

      await modRef.r.findMatchHandler.execute(new FindMatch(buy));

      // B reserved 120 USD, paid 100 and gets 20 back, less the taker fee
      await expectBalances([
        {
          usd: defaultWalletA.usd + 100 - MATCH_MAKER_FEE * 100,
          btc: defaultWalletA.btc,
        },
        {
          usd: defaultWalletB.usd + 20 - MATCH_TAKER_FEE * 100,
          btc: defaultWalletB.btc + 1,
        },
      ]);
    });

    it("Should refund the difference to a resting buyer", async () => {
      // A bids 100 for 1 BTC, then B sells 1 BTC at 90
      const buy = oldOrderBuilder
        .withSide(OrderSideEnum.Buy)
        .withPrice(100)
        .build();
      const sell = new OrderBuilder(1)
        .withSide(OrderSideEnum.Sell)
        .withUserId(defaultWalletB.id)
        .withPrice(90)
        .build();
      await executeTask(modRef.r.orderRepository.save(buy));
      await executeTask(modRef.r.orderRepository.save(sell));

      await modRef.r.findMatchHandler.execute(new FindMatch(sell));

      // The trade is at 90: A reserved 100 and gets 10 back, less the maker fee
      await expectBalances([
        {
          usd: defaultWalletA.usd + 10 - MATCH_MAKER_FEE * 90,
          btc: defaultWalletA.btc + 1,
        },
        {
          usd: defaultWalletB.usd + 90 - MATCH_TAKER_FEE * 90,
          btc: defaultWalletB.btc,
        },
      ]);
    });
  });

  describe("When a matched order changes before the results are saved", () => {
    // The worker read the order book, then another request changed the order
    const changeAfterRead = (change: Partial<Order>) => {
      const { findAll, save } = modRef.r.orderRepository;
      jest
        .spyOn(modRef.r.orderRepository, "findAll")
        .mockImplementationOnce((params) =>
          FPF.pipe(
            findAll(params),
            TE.tap((orders) =>
              A.sequence(TE.ApplicativeSeq)(
                orders.map((order) => save({ ...order, ...change })),
              ),
            ),
          ),
        );
    };

    const matchAgainstOldOrder = async () => {
      const oldOrder = oldOrderBuilder.withSide(OrderSideEnum.Sell).build();
      const newOrder = new OrderBuilder(1)
        .withSide(OrderSideEnum.Buy)
        .withUserId(defaultWalletB.id)
        .build();
      await executeTask(modRef.r.orderRepository.save(oldOrder));
      await executeTask(modRef.r.orderRepository.save(newOrder));
      return { oldOrder, newOrder };
    };

    it.each([
      ["cancelled", { status: OrderStatusEnum.Cancelled }],
      ["filled by another match", { filled: 0.5 }],
    ])("Should save nothing if it was %s", async (_, change) => {
      const { oldOrder, newOrder } = await matchAgainstOldOrder();
      changeAfterRead(change);

      await expect(
        modRef.r.findMatchHandler.execute(new FindMatch(newOrder)),
      ).rejects.toThrow(OrderChangedException);

      const [matches, wallets, orders] = await Promise.all([
        executeTask(modRef.r.matchRepository.findAll()),
        executeTask(modRef.r.walletRepository.findAll()),
        executeTask(modRef.r.orderRepository.findAll()),
      ]);
      expect(matches).toEqual([]);
      expect(wallets).toEqual([defaultWalletA, defaultWalletB]);
      expect(orders).toEqual([{ ...oldOrder, ...change }, newOrder]);
    });
  });
});
