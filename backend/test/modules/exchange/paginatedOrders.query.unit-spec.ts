import { Test } from "@nestjs/testing";
import { executeTask } from "@shared/utils/application/executeTask";
import { FakeOrderRepository } from "@src/modules/exchange/database/fakeOrder.repository";
import { OrderRepository } from "@src/modules/exchange/database/order.repository.port";
import {
  PaginatedOrdersQuery,
  PaginatedOrdersQueryHandler,
} from "@src/modules/exchange/queries/paginatedOrders/paginatedOrders.query";
import { DomainEventPublisherModule } from "@src/modules/shared/domain-event-publisher/domainEventPublisher.module";
import { OrderBuilder } from "@test/data-builders/orderBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";
import { TestHelper } from "@test/util/testHelper";

describe("[Unit] List Orders", () => {
  const modRef = new UnitModule(
    Test.createTestingModule({
      imports: [DomainEventPublisherModule],
      providers: [
        ...TestHelper.unitDefaultProviders,
        PaginatedOrdersQueryHandler,
        { provide: OrderRepository, useClass: FakeOrderRepository },
      ],
    }),
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
});
