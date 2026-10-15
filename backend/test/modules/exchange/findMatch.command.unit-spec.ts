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
import { A, FPF, O, TE } from "@shared/utils/application/monads";
import { Decimal } from "@shared/utils/domain/decimal";
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
    const matchVolume = oldOrder.amount.mul(oldOrder.price);
    // Seller pays MAKER_FEE Since his order is older
    const makerDiff = matchVolume.mul(MATCH_MAKER_FEE).neg();
    // Buyer receives 100% - TAKER_FEE Since his order is newer
    const takerDiff = matchVolume.mul(new Decimal(1).sub(MATCH_TAKER_FEE));
    const matchAmount = oldOrder.amount;
    const expectedUSDAmounts = [
      defaultWalletA.usd.add(makerDiff),
      defaultWalletB.usd.add(takerDiff),
    ];
    const expectedBTCAmounts = [
      defaultWalletA.btc.add(matchAmount),
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
    const matchVolume = oldOrder.amount.mul(oldOrder.price);
    // Seller pays MAKER_FEE Since his order is older
    const makerDiff = matchVolume.mul(new Decimal(1).sub(MATCH_MAKER_FEE));
    // Buyer receives 100% - TAKER_FEE Since his order is newer
    const takerDiff = matchVolume.mul(MATCH_TAKER_FEE).neg();
    const matchAmount = oldOrder.amount;
    const expectedUSDAmounts = [
      defaultWalletA.usd.add(makerDiff),
      defaultWalletB.usd.add(takerDiff),
    ];
    const expectedBTCAmounts = [
      defaultWalletA.btc,
      defaultWalletB.btc.add(matchAmount),
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
      .map((o) => o.amount.mul(o.price))
      .reduce((acc, o) => acc.add(o), new Decimal(0));
    // Seller pays MAKER_FEE Since his order is older
    const makerDiff = matchVolume.mul(MATCH_MAKER_FEE).neg();
    // Buyer receives 100% - TAKER_FEE Since his order is newer
    const takerDiff = matchVolume.mul(new Decimal(1).sub(MATCH_TAKER_FEE));
    const matchAmount = oldOrders
      .map((o) => o.amount)
      .reduce((acc, o) => acc.add(o), new Decimal(0));
    const expectedUSDAmounts = [
      defaultWalletA.usd.add(makerDiff),
      defaultWalletB.usd.add(takerDiff),
    ];
    const expectedBTCAmounts = [
      defaultWalletA.btc.add(matchAmount),
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
      .map((o) => o.amount.mul(o.price))
      .reduce((acc, o) => acc.add(o), new Decimal(0));
    // Seller pays MAKER_FEE Since his order is older
    const makerDiff = matchVolume.mul(new Decimal(1).sub(MATCH_MAKER_FEE));
    // Buyer receives 100% - TAKER_FEE Since his order is newer
    const takerDiff = matchVolume.mul(MATCH_TAKER_FEE).neg();
    const matchAmount = oldOrders
      .map((o) => o.amount)
      .reduce((acc, o) => acc.add(o), new Decimal(0));
    const expectedUSDAmounts = [
      defaultWalletA.usd.add(makerDiff),
      defaultWalletB.usd.add(takerDiff),
    ];
    const expectedBTCAmounts = [
      defaultWalletA.btc,
      defaultWalletB.btc.add(matchAmount),
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

  describe("With amounts floats cannot represent", () => {
    const sell = (n: number, amount: string, price: string) =>
      new OrderBuilder()
        .withId(createTestId(TableNameEnum.Order, n))
        .withSide(OrderSideEnum.Sell)
        .withAmount(amount)
        .withPrice(price)
        .build();
    const buy = (amount: string, price: string) =>
      new OrderBuilder(9)
        .withSide(OrderSideEnum.Buy)
        .withUserId(defaultWalletB.id)
        .withAmount(amount)
        .withPrice(price)
        .build();
    const save = (...orders: Order[]) =>
      Promise.all(
        orders.map((o) => executeTask(modRef.r.orderRepository.save(o))),
      );
    const balance = async (id: string) =>
      FPF.pipe(
        await executeTask(modRef.r.walletRepository.findById(id)),
        O.map((w) => ({ usd: w.usd.toString(), btc: w.btc.toString() })),
      );

    it("Should fill a 0.3 BTC order with 0.1 and 0.2 BTC exactly", async () => {
      // Resting orders must be older than the incoming one
      const resting = [sell(20, "0.1", "100"), sell(21, "0.2", "100")];
      const newOrder = buy("0.3", "100");
      await save(...resting, newOrder);

      await modRef.r.findMatchHandler.execute(new FindMatch(newOrder));

      // With floats, 0.3 - 0.1 - 0.2 leaves the buy order open
      const orders = await executeTask(modRef.r.orderRepository.findAll());
      expect(orders.map((o) => o.status)).toEqual([
        OrderStatusEnum.Complete,
        OrderStatusEnum.Complete,
        OrderStatusEnum.Complete,
      ]);
      expect(await balance(defaultWalletB.id)).toEqual(
        O.some({
          usd: defaultWalletB.usd.sub("0.09").toString(),
          btc: defaultWalletB.btc.add("0.3").toString(),
        }),
      );
    });

    it("Should round fees to 10 places and keep the rest exact", async () => {
      // One satoshi at 123.45 is worth 0.0000012345 USD
      const resting = sell(20, "0.00000001", "123.45");
      const newOrder = buy("0.00000001", "123.45");
      await save(resting, newOrder);

      await modRef.r.findMatchHandler.execute(new FindMatch(newOrder));

      // Maker fee 0.0000000061725 rounds to 0.0000000062,
      // taker fee 0.0000000037035 to 0.0000000037
      expect(await balance(defaultWalletA.id)).toEqual(
        O.some({
          usd: defaultWalletA.usd.add("0.0000012283").toString(),
          btc: defaultWalletA.btc.toString(),
        }),
      );
      expect(await balance(defaultWalletB.id)).toEqual(
        O.some({
          usd: defaultWalletB.usd.sub("0.0000000037").toString(),
          btc: defaultWalletB.btc.add("0.00000001").toString(),
        }),
      );
    });
  });

  describe("When the trade price is better than the buyer's price", () => {
    const balances = async () =>
      (await executeTask(modRef.r.walletRepository.findAll())).map(
        ({ usd, btc }) => ({ usd, btc }),
      );
    // Exact: the amounts are compared as decimal strings
    const expectBalances = async (
      expected: { usd: Decimal; btc: Decimal }[],
    ) => {
      expect(
        (await balances()).map(({ usd, btc }) => [
          usd.toString(),
          btc.toString(),
        ]),
      ).toEqual(
        expected.map(({ usd, btc }) => [usd.toString(), btc.toString()]),
      );
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
          usd: defaultWalletA.usd.add(100).sub(MATCH_MAKER_FEE.mul(100)),
          btc: defaultWalletA.btc,
        },
        {
          usd: defaultWalletB.usd.add(20).sub(MATCH_TAKER_FEE.mul(100)),
          btc: defaultWalletB.btc.add(1),
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
          usd: defaultWalletA.usd.add(10).sub(MATCH_MAKER_FEE.mul(90)),
          btc: defaultWalletA.btc.add(1),
        },
        {
          usd: defaultWalletB.usd.add(90).sub(MATCH_TAKER_FEE.mul(90)),
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
      ["filled by another match", { filled: new Decimal(0.5) }],
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
