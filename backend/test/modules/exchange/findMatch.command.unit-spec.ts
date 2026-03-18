import { Test } from "@nestjs/testing";
import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import {
  FindMatch,
  FindMatchHandler,
} from "@src/modules/exchange/commands/findMatch/findMatch.command";
import { FakeMatchRepository } from "@src/modules/exchange/database/fakeMatch.repository";
import { FakeOrderRepository } from "@src/modules/exchange/database/fakeOrder.repository";
import { FakeWalletRepository } from "@src/modules/exchange/database/fakeWallet.repository";
import { MatchRepository } from "@src/modules/exchange/database/match.repository.port";
import { OrderRepository } from "@src/modules/exchange/database/order.repository.port";
import { WalletRepository } from "@src/modules/exchange/database/wallet.repository.port";
import {
  MATCH_MAKER_FEE,
  MATCH_TAKER_FEE,
} from "@src/modules/exchange/domain/match.entity";
import {
  OrderSideEnum,
  OrderStatusEnum,
} from "@src/modules/exchange/domain/order.entity";
import { A, TE } from "@src/modules/shared/utils/application/monads";
import { OrderBuilder } from "@test/data-builders/orderBuilder";
import { WalletBuilder } from "@test/data-builders/walletBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UnitModule } from "@test/util/defaultModule.unit";
import { TestHelper } from "@test/util/testHelper";

//Adapters

describe("[Unit] Find Match", () => {
  const oldOrderBuilder = new OrderBuilder();
  const modRef = new UnitModule(
    Test.createTestingModule({
      imports: [DomainEventPublisherModule],
      providers: [
        ...TestHelper.unitDefaultProviders,
        FindMatchHandler,
        { provide: WalletRepository, useClass: FakeWalletRepository },
        { provide: OrderRepository, useClass: FakeOrderRepository },
        { provide: MatchRepository, useClass: FakeMatchRepository },
      ],
    }),
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
});
