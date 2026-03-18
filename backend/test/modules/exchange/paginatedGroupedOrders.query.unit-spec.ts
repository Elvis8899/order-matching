import { Test } from "@nestjs/testing";
import { executeTask } from "@shared/utils/application/executeTask";
import { FakeOrderRepository } from "@src/modules/exchange/database/fakeOrder.repository";
import { OrderRepository } from "@src/modules/exchange/database/order.repository.port";
import { OrderSideEnum } from "@src/modules/exchange/domain/order.entity";
import {
  PaginatedGroupedOrdersQuery,
  PaginatedGroupedOrdersQueryHandler,
} from "@src/modules/exchange/queries/paginatedGroupedOrders/paginatedGroupedOrders.query";
import { DomainEventPublisherModule } from "@src/modules/shared/domain-event-publisher/domainEventPublisher.module";
import { OrderBuilder } from "@test/data-builders/orderBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";
import { TestHelper } from "@test/util/testHelper";

describe("[Unit] List Grouped Orders", () => {
  const modRef = new UnitModule(
    Test.createTestingModule({
      imports: [DomainEventPublisherModule],
      providers: [
        ...TestHelper.unitDefaultProviders,
        PaginatedGroupedOrdersQueryHandler,
        { provide: OrderRepository, useClass: FakeOrderRepository },
      ],
    }),
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
