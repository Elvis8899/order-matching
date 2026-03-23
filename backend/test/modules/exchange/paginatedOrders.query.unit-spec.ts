import {
  executeTask,
  executeTasks,
} from "@shared/utils/application/executeTask";
import { FakeOrderRepository } from "@src/modules/exchange/database/fakeOrder.repository";
import { OrderRepository } from "@src/modules/exchange/database/order.repository.port";
import {
  OrderSideEnum,
  OrderStatusEnum,
} from "@src/modules/exchange/domain/order.entity";
import {
  PaginatedOrdersQuery,
  PaginatedOrdersQueryHandler,
} from "@src/modules/exchange/queries/paginatedOrders/paginatedOrders.query";
import { DomainEventPublisherModule } from "@src/modules/shared/domain-event-publisher/domainEventPublisher.module";
import { OrderBuilder } from "@test/data-builders/orderBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UnitModule } from "@test/util/defaultModule.unit";

describe("[Unit] List Orders", () => {
  const modRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        PaginatedOrdersQueryHandler,
        { provide: OrderRepository, useClass: FakeOrderRepository },
      ],
    },
    (ref) => ({
      orderRepository: ref.get(OrderRepository),
      paginatedOrdersQueryHandler: ref.get(PaginatedOrdersQueryHandler),
    }),
  );

  beforeEach(async () => {
    await modRef.init();
  });

  it("Should list orders if query is valid", async () => {
    //Given a valid query
    const limit = 10;
    const page = 0;
    const query = new PaginatedOrdersQuery({
      limit,
      page,
    });

    //With orders in database
    const order = new OrderBuilder().build();
    await executeTask(modRef.r.orderRepository.save(order));

    //When we list orders
    const result = await modRef.r.paginatedOrdersQueryHandler.execute(query);
    //Then it should show a list of orders
    expect(result.data.length).toBe(1);
    expect(result.data[0]).toStrictEqual(order);
    expect(result.count).toBe(1);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  it("Shouldnt list orders if page is invalid", async () => {
    //Given a valid query
    const limit = 10;
    const page = 1;
    const query = new PaginatedOrdersQuery({
      limit,
      page,
    });

    //With orders in database
    const order = new OrderBuilder().build();
    await executeTask(modRef.r.orderRepository.save(order));

    //When we list orders
    const result = await modRef.r.paginatedOrdersQueryHandler.execute(query);
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
    const query = new PaginatedOrdersQuery({
      limit,
      page,
    });

    //When we list orders
    const result = await modRef.r.paginatedOrdersQueryHandler.execute(query);
    //Then it should show an empty list
    expect(result.data.length).toBe(0);
    expect(result.count).toBe(0);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  //

  it("Query should work as expected", async () => {
    //With order in database
    const order = new OrderBuilder().build();
    await executeTask(modRef.r.orderRepository.save(order));

    //When we try to retrieve with queries that wouldn't find anything
    const resultEmpty = await executeTasks(
      modRef.r.orderRepository.findAll({
        query: { maxDate: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      modRef.r.orderRepository.findAll({
        query: { minPrice: order.price + 1 },
      }),
      modRef.r.orderRepository.findAll({
        query: { maxPrice: order.price - 1 },
      }),
      modRef.r.orderRepository.findAll({
        query: { status: OrderStatusEnum.Cancelled },
      }),
      modRef.r.orderRepository.findAll({
        query: { side: OrderSideEnum.Sell },
      }),
      modRef.r.orderRepository.findAll({
        query: { userId: createTestId(TableNameEnum.None, 0) },
      }),
    );

    // Or queries that would find something
    const resultNonEmpty = await executeTasks(
      modRef.r.orderRepository.findAll(),
      modRef.r.orderRepository.findAll({
        query: { maxDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      }),
      modRef.r.orderRepository.findAll({
        query: { minPrice: order.price - 1 },
      }),
      modRef.r.orderRepository.findAll({
        query: { maxPrice: order.price + 1 },
      }),
      modRef.r.orderRepository.findAll({
        query: { status: order.status },
      }),
      modRef.r.orderRepository.findAll({
        query: { side: order.side },
      }),
      modRef.r.orderRepository.findAll({
        query: { userId: order.userId },
      }),
      modRef.r.orderRepository.findAll({
        query: {
          userId: order.userId,
          side: order.side,
          status: order.status,
          maxPrice: order.price + 1,
          minPrice: order.price - 1,
          maxDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }),
    );
    resultEmpty.forEach((res) => {
      expect(res.length).toBe(0);
    });
    resultNonEmpty.forEach((res) => {
      expect(res.length).toBe(1);
    });
  });
});
