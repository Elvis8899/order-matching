import {
  CancelOrder,
  CancelOrderHandler,
} from "@exchange/commands/cancelOrder/cancelOrder.command";
import { FakeMatchRepository } from "@exchange/database/fakeMatch.repository";
import { FakeOrderRepository } from "@exchange/database/fakeOrder.repository";
import { FakeSettlementRepository } from "@exchange/database/fakeSettlement.repository";
import { FakeWalletRepository } from "@exchange/database/fakeWallet.repository";
import { MatchRepository } from "@exchange/database/match.repository.port";
import { OrderRepository } from "@exchange/database/order.repository.port";
import { SettlementRepository } from "@exchange/database/settlement.repository.port";
import { WalletRepository } from "@exchange/database/wallet.repository.port";
import {
  OrderChangedException,
  OrderNotFoundException,
} from "@exchange/domain/exchange.errors";
import {
  Order,
  OrderSideEnum,
  OrderStatusEnum,
} from "@exchange/domain/order.entity";
import { Wallet } from "@exchange/domain/wallet.entity";
import { DomainEventPublisher } from "@shared/domainEventPublisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domainEventPublisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { FPF, O, TE } from "@shared/utils/application/monads";
import { OrderBuilder } from "@test/dataBuilders/orderBuilder";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { WalletBuilder } from "@test/dataBuilders/walletBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UnitModule } from "@test/util/defaultModule.unit";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";

//Adapters

describe("[Unit] Cancel Order", () => {
  const modRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        CancelOrderHandler,
        { provide: UserRepository, useClass: FakeUserRepository },
        { provide: WalletRepository, useClass: FakeWalletRepository },
        { provide: OrderRepository, useClass: FakeOrderRepository },
        { provide: MatchRepository, useClass: FakeMatchRepository },
        { provide: SettlementRepository, useClass: FakeSettlementRepository },
      ],
    },
    (ref) => ({
      walletRepository: ref.get(WalletRepository),
      orderRepository: ref.get(OrderRepository),
      userRepository: ref.get(UserRepository),
      cancelOrderHandler: ref.get(CancelOrderHandler),
      eventPublisher: ref.get(DomainEventPublisher),
    }),
  );

  const defaultUser = new UserBuilder().build();
  const defaultWallet = new WalletBuilder().build();
  const defaultOrder = new OrderBuilder().build();
  beforeEach(async () => {
    await modRef.init();

    await executeTask(modRef.r.walletRepository.save(defaultWallet));
    await executeTask(modRef.r.userRepository.save(defaultUser));
    await executeTask(modRef.r.orderRepository.save(defaultOrder));
  });

  it("Should cancel order if order is valid - Buy", async () => {
    // Given a potentially valid orderid
    const id = defaultOrder.id;
    const userId = defaultOrder.userId;

    // When we cancel a order
    const resultPromise = modRef.r.cancelOrderHandler.execute(
      new CancelOrder(id, userId),
    );

    // Then it should have canceled an order
    await expect(resultPromise).resolves.toEqual(undefined);

    const orders = await executeTask(modRef.r.orderRepository.findAll());
    expect(orders.length).toEqual(1);
    expect((orders[0] as Order).status).toEqual(OrderStatusEnum.Cancelled);

    // And  it should have updated user wallet
    const wallet = await executeTask(
      modRef.r.walletRepository.findById(defaultWallet.id),
    );
    const expectedUSD =
      defaultWallet.usd + defaultOrder.amount * defaultOrder.price;
    const expectedBTC = defaultWallet.btc;
    expect(
      FPF.pipe(
        wallet,
        O.filter((w: Wallet) => w.usd == expectedUSD && w.btc == expectedBTC),
        O.isSome,
      ),
    ).toBe(true);
  });

  it("Should cancel order if order is valid - Sell", async () => {
    // Given a potentially valid orderid
    const sellOrder = new OrderBuilder(1).withSide(OrderSideEnum.Sell).build();
    const id = sellOrder.id;
    const userId = sellOrder.userId;
    await executeTask(modRef.r.orderRepository.save(sellOrder));
    // When we cancel a order
    const resultPromise = modRef.r.cancelOrderHandler.execute(
      new CancelOrder(id, userId),
    );

    // Then it should have canceled an order
    await expect(resultPromise).resolves.toEqual(undefined);

    const orders = await executeTask(modRef.r.orderRepository.findAll());
    expect(orders.length).toEqual(2);
    expect((orders[1] as Order).status).toEqual(OrderStatusEnum.Cancelled);

    // And  it should have updated user wallet
    const wallet = await executeTask(
      modRef.r.walletRepository.findById(defaultWallet.id),
    );
    const expectedUSD = defaultWallet.usd;
    const expectedBTC = defaultWallet.btc + defaultOrder.amount;
    expect(
      FPF.pipe(
        wallet,
        O.filter((w: Wallet) => w.usd == expectedUSD && w.btc == expectedBTC),
        O.isSome,
      ),
    ).toBe(true);
  });

  it("Should emit domain event when order is cancelled", async () => {
    //Given a potentially valid name

    const spy = jest.spyOn(modRef.r.eventPublisher, "publishEvent");

    //When we create a order
    await modRef.r.cancelOrderHandler.execute(
      new CancelOrder(defaultOrder.id, defaultOrder.userId),
    );

    //Then it should have created a order and emitted an event
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("Should not cancel an order if order id is invalid", async () => {
    //Given a potentially valid id
    const id = createTestId(TableNameEnum.Order, 10);
    //When we cancel a order
    const resultPromise = modRef.r.cancelOrderHandler.execute(
      new CancelOrder(id, defaultOrder.userId),
    );

    //Then it should have thrown an error and not have cancelled an order
    await expect(resultPromise).rejects.toBeInstanceOf(OrderNotFoundException);

    const orders = await executeTask(modRef.r.orderRepository.findAll());
    expect(orders.length).toEqual(1);
  });

  it("Should not cancel an order if user id is invalid", async () => {
    //Given a potentially valid id
    const userId = createTestId(TableNameEnum.User, 10);
    //When we cancel a order
    const resultPromise = modRef.r.cancelOrderHandler.execute(
      new CancelOrder(defaultOrder.id, userId),
    );

    //Then it should have thrown an error and not have cancelled an order
    await expect(resultPromise).rejects.toBeInstanceOf(OrderNotFoundException);

    const orders = await executeTask(modRef.r.orderRepository.findAll());
    expect(orders.length).toEqual(1);
  });

  it("Should not cancel an order order is already canceled", async () => {
    //Given an existing order
    const order = new OrderBuilder()
      .withStatus(OrderStatusEnum.Cancelled)
      .build();
    await executeTask(modRef.r.orderRepository.save(order));
    //When we create two orders with the same name

    const resultPromise = modRef.r.cancelOrderHandler.execute(
      new CancelOrder(defaultOrder.id, defaultOrder.userId),
    );
    await expect(resultPromise).rejects.toBeInstanceOf(OrderNotFoundException);
  });

  it("Should refund only the unfilled part of a partially filled order", async () => {
    // Given a buy order and a sell order, each half filled
    const buyOrder = new OrderBuilder(1).withAmount(4).build();
    const sellOrder = new OrderBuilder(2)
      .withSide(OrderSideEnum.Sell)
      .withAmount(4)
      .build();
    await executeTask(
      modRef.r.orderRepository.save({ ...buyOrder, filled: 1 }),
    );
    await executeTask(
      modRef.r.orderRepository.save({ ...sellOrder, filled: 3 }),
    );

    // When both are cancelled
    await modRef.r.cancelOrderHandler.execute(
      new CancelOrder(buyOrder.id, buyOrder.userId),
    );
    await modRef.r.cancelOrderHandler.execute(
      new CancelOrder(sellOrder.id, sellOrder.userId),
    );

    // Then only the reserved funds still unused come back
    const wallet = await executeTask(
      modRef.r.walletRepository.findById(defaultWallet.id),
    );
    expect(wallet).toEqual(
      O.some(
        expect.objectContaining({
          usd: defaultWallet.usd + 3 * buyOrder.price,
          btc: defaultWallet.btc + 1,
        }),
      ),
    );
  });

  it("Should not cancel or refund an order filled after it was read", async () => {
    // A match is saved between reading the order and cancelling it
    const { findById, save } = modRef.r.orderRepository;
    jest
      .spyOn(modRef.r.orderRepository, "findById")
      .mockImplementationOnce((id) =>
        FPF.pipe(
          findById(id),
          TE.tap(() => save({ ...defaultOrder, filled: 0.5 })),
        ),
      );

    const resultPromise = modRef.r.cancelOrderHandler.execute(
      new CancelOrder(defaultOrder.id, defaultOrder.userId),
    );

    await expect(resultPromise).rejects.toBeInstanceOf(OrderChangedException);
    const [order, wallet] = await Promise.all([
      executeTask(modRef.r.orderRepository.findById(defaultOrder.id)),
      executeTask(modRef.r.walletRepository.findById(defaultWallet.id)),
    ]);
    expect(order).toEqual(
      O.some({ ...defaultOrder, filled: 0.5, status: OrderStatusEnum.Active }),
    );
    expect(wallet).toEqual(O.some(defaultWallet));
  });
});
