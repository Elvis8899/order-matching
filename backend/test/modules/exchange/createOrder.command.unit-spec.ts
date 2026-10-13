import {
  CreateOrder,
  CreateOrderHandler,
} from "@exchange/commands/createOrder/createOrder.command";
import { FakeOrderRepository } from "@exchange/database/fakeOrder.repository";
import { FakeWalletRepository } from "@exchange/database/fakeWallet.repository";
import { OrderRepository } from "@exchange/database/order.repository.port";
import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { InsufficientWalletFundsException } from "@exchange/domain/exchange.errors";
import { OrderSideEnum } from "@exchange/domain/order.entity";
import { Wallet } from "@exchange/domain/wallet.entity";
import { DomainEventPublisher } from "@shared/domainEventPublisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domainEventPublisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { FPF, O } from "@shared/utils/application/monads";
import { OrderBuilder } from "@test/dataBuilders/orderBuilder";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { WalletBuilder } from "@test/dataBuilders/walletBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";

//Adapters

describe("[Unit] Create Order", () => {
  const modRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        CreateOrderHandler,
        { provide: UserRepository, useClass: FakeUserRepository },
        { provide: WalletRepository, useClass: FakeWalletRepository },
        { provide: OrderRepository, useClass: FakeOrderRepository },
      ],
    },
    (ref) => ({
      walletRepository: ref.get(WalletRepository),
      orderRepository: ref.get(OrderRepository),
      userRepository: ref.get(UserRepository),
      createOrderHandler: ref.get(CreateOrderHandler),
      eventPublisher: ref.get(DomainEventPublisher),
    }),
  );

  const defaultUser = new UserBuilder().build();
  const defaultWallet = new WalletBuilder().build();
  beforeEach(async () => {
    await modRef.init();

    await executeTask(modRef.r.walletRepository.save(defaultWallet));
    await executeTask(modRef.r.userRepository.save(defaultUser));
  });

  it("Should create order if order is valid - Buy", async () => {
    // Given a potentially valid order
    const order = new OrderBuilder().buildCreateDTO();

    // When we create a order
    const resultPromise = modRef.r.createOrderHandler.execute(
      new CreateOrder(order),
    );

    // Then it should have created a order
    await expect(resultPromise).resolves.toEqual(undefined);

    const orders = await executeTask(modRef.r.orderRepository.findAll());
    expect(orders.length).toEqual(1);

    // And  it should have updated user wallet
    const wallet = await executeTask(
      modRef.r.walletRepository.findById(defaultWallet.id),
    );
    const expectedUSD = defaultWallet.usd - order.amount * order.price;
    const expectedBTC = defaultWallet.btc;
    expect(
      FPF.pipe(
        wallet,
        O.filter((w: Wallet) => w.usd == expectedUSD && w.btc == expectedBTC),
        O.isSome,
      ),
    ).toBe(true);
  });

  it("Should create order if order is valid - Sell", async () => {
    // Given a potentially valid order
    const order = new OrderBuilder()
      .withSide(OrderSideEnum.Sell)
      .buildCreateDTO();

    // When we create a order
    const resultPromise = modRef.r.createOrderHandler.execute(
      new CreateOrder(order),
    );

    // Then it should have created a order
    await expect(resultPromise).resolves.toEqual(undefined);

    const orders = await executeTask(modRef.r.orderRepository.findAll());
    expect(orders.length).toEqual(1);

    // And  it should have updated user wallet
    const wallet = await executeTask(
      modRef.r.walletRepository.findById(defaultWallet.id),
    );
    const expectedUSD = defaultWallet.usd;
    const expectedBTC = defaultWallet.btc - order.amount;
    expect(
      FPF.pipe(
        wallet,
        O.filter((w: Wallet) => w.usd == expectedUSD && w.btc == expectedBTC),
        O.isSome,
      ),
    ).toBe(true);
  });

  it("Should create order without optional keys", async () => {
    //Given a potentially valid name

    const order = new OrderBuilder().buildCreateDTO();
    //When we create a order
    const resultPromise = modRef.r.createOrderHandler.execute(
      new CreateOrder(order),
    );

    //Then it should have created a order
    await expect(resultPromise).resolves.toEqual(undefined);

    const orders = await executeTask(modRef.r.orderRepository.findAll());
    expect(orders.length).toEqual(1);
  });

  it("Should emit domain event when order is created", async () => {
    //Given a potentially valid name

    const spy = jest.spyOn(modRef.r.eventPublisher, "publishEvent");

    const order = new OrderBuilder().buildCreateDTO();
    //When we create a order
    await modRef.r.createOrderHandler.execute(new CreateOrder(order));

    //Then it should have created a order and emitted an event
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("Should not create order without funds", async () => {
    //Given a potentially valid order

    const order = new OrderBuilder().withAmount(2000).buildCreateDTO();
    //When we create a order
    const resultPromise = modRef.r.createOrderHandler.execute(
      new CreateOrder(order),
    );

    //Then it should not have created a order
    await expect(resultPromise).rejects.toBeInstanceOf(
      InsufficientWalletFundsException,
    );

    // And it should not have created a order
    const orders = await executeTask(modRef.r.orderRepository.findAll());
    expect(orders.length).toEqual(0);
  });
});
