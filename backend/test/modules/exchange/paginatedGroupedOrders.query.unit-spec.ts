import { executeTask } from "@shared/utils/application/executeTask";
import { FakeOrderRepository } from "@src/modules/exchange/database/fakeOrder.repository";
import { OrderRepository } from "@src/modules/exchange/database/order.repository.port";
import {
  Order,
  OrderSideEnum,
} from "@src/modules/exchange/domain/order.entity";
import {
  PaginatedGroupedOrdersQuery,
  PaginatedGroupedOrdersQueryHandler,
} from "@src/modules/exchange/queries/paginatedGroupedOrders/paginatedGroupedOrders.query";
import { DomainEventPublisherModule } from "@src/modules/shared/domain-event-publisher/domainEventPublisher.module";
import { A } from "@src/modules/shared/utils/application/monads";
import { OrderBuilder } from "@test/data-builders/orderBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";

describe("[Unit] List Grouped Orders", () => {
  const modRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        PaginatedGroupedOrdersQueryHandler,
        { provide: OrderRepository, useClass: FakeOrderRepository },
      ],
    },
    (ref) => ({
      orderRepository: ref.get(OrderRepository),
      paginatedGroupedOrdersQueryHandler: ref.get(
        PaginatedGroupedOrdersQueryHandler,
      ),
    }),
  );

  beforeEach(async () => {
    await modRef.init();
  });

  it("Should list grouped orders if query is valid", async () => {
    //Given a valid query
    const limit = 10;
    const page = 0;
    const query = new PaginatedGroupedOrdersQuery({
      limit,
      page,
      side: OrderSideEnum.Buy,
    });

    //With orders in database
    const order = new OrderBuilder().build();
    await executeTask(modRef.r.orderRepository.save(order));

    //When we list orders
    const result =
      await modRef.r.paginatedGroupedOrdersQueryHandler.execute(query);
    //Then it should show a list of orders
    expect(result.data.length).toBe(1);
    expect(result.data[0]).toStrictEqual({
      amount: order.amount,
      price: order.price,
      volume: order.price * order.amount,
    });
    expect(result.count).toBe(1);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  it("Should list grouped orders if query is valid - Buy", async () => {
    //Given a valid query
    const limit = 10;
    const page = 0;
    const query = new PaginatedGroupedOrdersQuery({
      limit,
      page,
      side: OrderSideEnum.Buy,
    });

    //With orders in database
    const orders = A.makeBy(5, (v) =>
      new OrderBuilder(v)
        .withAmount(v || 1)
        .withPrice(v || 1)
        .build(),
    ) as [Order];
    const ordersToSave = orders.map((order) =>
      modRef.r.orderRepository.save(order),
    ) as [ReturnType<typeof modRef.r.orderRepository.save>];

    await executeTask(...ordersToSave);

    //When we list orders
    const result =
      await modRef.r.paginatedGroupedOrdersQueryHandler.execute(query);
    //Then it should show a list of orders
    expect(result.data.length).toBe(4);
    expect(result.data[3]).toStrictEqual({
      amount: 2 * orders[0].amount,
      price: orders[0].price,
      volume: 2 * orders[0].price * orders[0].amount,
    });
    expect(result.count).toBe(4);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  it("Should list grouped orders if query is valid - Sell", async () => {
    //Given a valid query
    const limit = 10;
    const page = 0;
    const query = new PaginatedGroupedOrdersQuery({
      limit,
      page,
      side: OrderSideEnum.Sell,
    });

    //With orders in database
    const orders = A.makeBy(5, (v) =>
      new OrderBuilder(v)
        .withSide(OrderSideEnum.Sell)
        .withAmount(v || 1)
        .withPrice(v || 1)
        .build(),
    ) as [Order];
    const ordersToSave = orders.map((order) =>
      modRef.r.orderRepository.save(order),
    ) as [ReturnType<typeof modRef.r.orderRepository.save>];

    await executeTask(...ordersToSave);

    //When we list orders
    const result =
      await modRef.r.paginatedGroupedOrdersQueryHandler.execute(query);
    //Then it should show a list of orders
    expect(result.data.length).toBe(4);
    expect(result.data[0]).toStrictEqual({
      amount: 2 * orders[0].amount,
      price: orders[0].price,
      volume: 2 * orders[0].price * orders[0].amount,
    });
    expect(result.count).toBe(4);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  it("Shouldnt list orders if page is invalid", async () => {
    //Given a valid query
    const limit = 10;
    const page = 1;
    const query = new PaginatedGroupedOrdersQuery({
      limit,
      page,
      side: OrderSideEnum.Buy,
    });

    //With orders in database
    const order = new OrderBuilder().build();
    await executeTask(modRef.r.orderRepository.save(order));

    //When we list orders
    const result =
      await modRef.r.paginatedGroupedOrdersQueryHandler.execute(query);
    //Then it should show a list of orders
    expect(result.data.length).toBe(0);
    expect(result.count).toBe(1);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  it("Shouldnt list orders if there isnt orders", async () => {
    //Given a valid query and no orders in database
    const limit = 10;
    const page = 0;
    const query = new PaginatedGroupedOrdersQuery({
      limit,
      page,
      side: OrderSideEnum.Buy,
    });

    //When we list orders
    const result =
      await modRef.r.paginatedGroupedOrdersQueryHandler.execute(query);
    //Then it should show an empty list
    expect(result.data.length).toBe(0);
    expect(result.count).toBe(0);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });
});
