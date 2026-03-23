import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import {
  CancelOrder,
  CancelOrderHandler,
} from "@src/modules/exchange/commands/cancelOrder/cancelOrder.command";
import { FakeOrderRepository } from "@src/modules/exchange/database/fakeOrder.repository";
import { FakeWalletRepository } from "@src/modules/exchange/database/fakeWallet.repository";
import { OrderRepository } from "@src/modules/exchange/database/order.repository.port";
import { WalletRepository } from "@src/modules/exchange/database/wallet.repository.port";
import { OrderNotFoundException } from "@src/modules/exchange/domain/exchange.errors";
import {
  Order,
  OrderSideEnum,
  OrderStatusEnum,
} from "@src/modules/exchange/domain/order.entity";
import { Wallet } from "@src/modules/exchange/domain/wallet.entity";
import { FPF, O } from "@src/modules/shared/utils/application/monads";
import { FakeUserRepository } from "@src/modules/user/database/fakeUser.repository";
import { UserRepository } from "@src/modules/user/database/user.repository.port";
import { OrderBuilder } from "@test/data-builders/orderBuilder";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { WalletBuilder } from "@test/data-builders/walletBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UnitModule } from "@test/util/defaultModule.unit";

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
});
