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
import { UnprocessableEntityException } from "@nestjs/common";
import { DomainEventPublisher } from "@shared/domainEventPublisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domainEventPublisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { FPF, O } from "@shared/utils/application/monads";
import { Decimal } from "@shared/utils/domain/decimal";
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
    const expectedUSD = defaultWallet.usd.sub(
      new Decimal(order.amount).mul(new Decimal(order.price)),
    );
    const expectedBTC = defaultWallet.btc;
    expect(
      FPF.pipe(
        wallet,
        O.filter((w: Wallet) => w.usd.eq(expectedUSD) && w.btc.eq(expectedBTC)),
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
    const expectedBTC = defaultWallet.btc.sub(new Decimal(order.amount));
    expect(
      FPF.pipe(
        wallet,
        O.filter((w: Wallet) => w.usd.eq(expectedUSD) && w.btc.eq(expectedBTC)),
        O.isSome,
      ),
    ).toBe(true);
  });

  it("Should create order without optional keys", async () => {
    // Given only the keys a client sends
    const { userId, side, price, amount } = new OrderBuilder().buildCreateDTO();

    //When we create a order
    const resultPromise = modRef.r.createOrderHandler.execute(
      new CreateOrder({ userId, side, price, amount }),
    );

    //Then it should have created an unfilled order
    await expect(resultPromise).resolves.toEqual(undefined);

    const orders = await executeTask(modRef.r.orderRepository.findAll());
    expect(orders.length).toEqual(1);
    expect(orders[0]?.filled.isZero()).toBe(true);
  });

  it("Should reserve exactly the order's cost from decimal strings", async () => {
    const order = new OrderBuilder()
      .withPrice("30000.55")
      .withAmount("0.1")
      .buildCreateDTO();

    await modRef.r.createOrderHandler.execute(new CreateOrder(order));

    const wallet = await executeTask(
      modRef.r.walletRepository.findById(defaultWallet.id),
    );
    expect(O.map((w: Wallet) => w.usd.toString())(wallet)).toEqual(
      O.some(defaultWallet.usd.sub("3000.055").toString()),
    );
  });

  it.each([
    ["a price with more than 2 places", { price: "100.001" }],
    ["a zero price", { price: "0" }],
    ["a negative price", { price: "-100" }],
    ["an amount with more than 8 places", { amount: "0.000000001" }],
    ["a zero amount", { amount: 0 }],
    ["a negative amount", { amount: "-1" }],
    ["an amount in exponent notation", { amount: "1e-3" }],
  ])("Should not create an order with %s", async (_, change) => {
    const order = Object.assign(new OrderBuilder().buildCreateDTO(), change);

    const resultPromise = modRef.r.createOrderHandler.execute(
      new CreateOrder(order),
    );

    await expect(resultPromise).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    const orders = await executeTask(modRef.r.orderRepository.findAll());
    expect(orders).toEqual([]);
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
