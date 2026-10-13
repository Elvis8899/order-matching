import { OrderRepository } from "@exchange/database/order.repository.port";
import { RealOrderRepository } from "@exchange/database/realOrder.repository";
import { OrderSideEnum, OrderStatusEnum } from "@exchange/domain/order.entity";
import { InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";
import {
  executeTask,
  executeTasks,
} from "@shared/utils/application/executeTask";
import { OrderBuilder } from "@test/data-builders/orderBuilder";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { IntegrationModule } from "@test/util/defaultModule.inte";
import { TestHelper } from "@test/util/testHelper";
import { RealUserRepository } from "@user/database/realUser.repository";
import { UserRepository } from "@user/database/user.repository.port";

const inteM = new IntegrationModule(
  [
    PrismaService,
    { provide: UserRepository, useClass: RealUserRepository },
    { provide: OrderRepository, useClass: RealOrderRepository },
  ],
  (app) => ({
    userRepository: app.get(UserRepository),
    prismaService: app.get(PrismaService),
    orderRepository: app.get(OrderRepository),
  }),
);
beforeAll(async () => {
  await inteM.init();
  await executeTask(inteM.r.userRepository.save(new UserBuilder().build()));
});

afterAll(async () => {
  await inteM.r.prismaService.$disconnect();
});

describe("[Integration] Order repository", () => {
  const orderBuilder = new OrderBuilder();

  beforeEach(async () => {
    await inteM.r.prismaService.order.deleteMany();
  });

  afterEach(async () => {
    await inteM.r.prismaService.order.deleteMany();
    orderBuilder.reset();
  });

  it("Successfully get order after save", async () => {
    //Given an existing order in database

    const order = orderBuilder.build();
    await executeTask(inteM.r.orderRepository.save(order));

    // Should be able to retrieve it

    const [resultById, resultPaginated, resultAll] = await executeTasks(
      inteM.r.orderRepository.findById(order.id),
      inteM.r.orderRepository.findAllPaginated({
        page: 0,
        limit: 10,
        query: {},
      }),
      inteM.r.orderRepository.findAll(),
    );

    const expectSomeOrder = TestHelper.expectSome(order);

    expectSomeOrder(resultById);
    expect(resultPaginated.count).toBe(1);
    expect(resultPaginated.data.length).toBe(1);
    expect(resultAll.length).toBe(1);
  });

  it("Successfully delete order after save", async () => {
    //Given an inexisting order in database
    const order = orderBuilder.build();

    await executeTask(inteM.r.orderRepository.save(order));

    //When we delete him

    await executeTask(inteM.r.orderRepository.deleteById(order.id));
    //Then we should have deleted him
    const savedOrders = await inteM.r.prismaService.order.findMany({});

    expect(savedOrders.length).toBe(0);
  });

  it("Should not delete order with wrong id", async () => {
    //Given an existing order in database
    const order = orderBuilder.build();

    await executeTask(inteM.r.orderRepository.save(order));

    //When we try deleting with wrong order id

    const resultPromise = executeTask(
      inteM.r.orderRepository.deleteById(createTestId(TableNameEnum.None, 0)),
    );
    //Then we should not have deleted him
    await expect(resultPromise).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    const savedOrders = await inteM.r.prismaService.order.findMany({});

    expect(savedOrders.length).toBe(1);
  });

  it("Return null when there is no order", async () => {
    //Given no existing orders in database
    const unsavedOrder = orderBuilder
      .withId(createTestId(TableNameEnum.None, 0))
      .build();

    //When we try to retrieve
    const [resultById, resultPaginated, resultAll] = await executeTasks(
      inteM.r.orderRepository.findById(unsavedOrder.id),
      inteM.r.orderRepository.findAllPaginated({
        page: 0,
        limit: 10,
        query: {},
      }),
      inteM.r.orderRepository.findAll(),
    );

    TestHelper.expectNone(resultById);
    expect(resultPaginated.count).toBe(0);
    expect(resultPaginated.data.length).toBe(0);
    expect(resultAll.length).toBe(0);
  });

  it("Query should work as expected", async () => {
    //Given an existing order in database
    const order = orderBuilder.build();
    await executeTask(inteM.r.orderRepository.save(order));

    //When we try to retrieve with queries that wouldn't find anything
    const resultEmpty = await executeTasks(
      inteM.r.orderRepository.findAll({
        query: { maxDate: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      inteM.r.orderRepository.findAll({
        query: { minPrice: order.price + 1 },
      }),
      inteM.r.orderRepository.findAll({
        query: { maxPrice: order.price - 1 },
      }),
      inteM.r.orderRepository.findAll({
        query: { status: OrderStatusEnum.Cancelled },
      }),
      inteM.r.orderRepository.findAll({
        query: { side: OrderSideEnum.Sell },
      }),
      inteM.r.orderRepository.findAll({
        query: { userId: createTestId(TableNameEnum.None, 0) },
      }),
    );

    // Or queries that would find something
    const resultNonEmpty = await executeTasks(
      inteM.r.orderRepository.findAll(),
      inteM.r.orderRepository.findAll({
        query: { maxDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      }),
      inteM.r.orderRepository.findAll({
        query: { minPrice: order.price - 1 },
      }),
      inteM.r.orderRepository.findAll({
        query: { maxPrice: order.price + 1 },
      }),
      inteM.r.orderRepository.findAll({
        query: { status: order.status },
      }),
      inteM.r.orderRepository.findAll({
        query: { side: order.side },
      }),
      inteM.r.orderRepository.findAll({
        query: { userId: order.userId },
      }),
      inteM.r.orderRepository.findAll({
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

  it("Successfully get grouped orders after save - BUY", async () => {
    //Given an existing order in database

    const order = orderBuilder.build();
    await executeTask(inteM.r.orderRepository.save(order));

    // Should be able to retrieve it

    const resultPaginated = await executeTask(
      inteM.r.orderRepository.paginatedGroupedOrders({
        page: 0,
        limit: 10,
        query: { side: order.side },
      }),
    );

    expect(resultPaginated.count).toBe(1);
    expect(resultPaginated.data.length).toBe(1);
    expect(resultPaginated).toMatchObject({
      data: [
        {
          price: order.price,
          amount: order.amount,
          volume: order.price * order.amount,
        },
      ],
      count: 1,
      page: 0,
      limit: 10,
    });
  });

  it("Successfully get grouped orders after save - SELL", async () => {
    //Given an existing order in database

    const order = orderBuilder.withSide(OrderSideEnum.Sell).build();
    await executeTask(inteM.r.orderRepository.save(order));

    // Should be able to retrieve it

    const resultPaginated = await executeTask(
      inteM.r.orderRepository.paginatedGroupedOrders({
        page: 0,
        limit: 10,
        query: { side: order.side },
      }),
    );

    expect(resultPaginated.count).toBe(1);
    expect(resultPaginated.data.length).toBe(1);
    expect(resultPaginated).toMatchObject({
      data: [
        {
          price: order.price,
          amount: order.amount,
          volume: order.price * order.amount,
        },
      ],
      count: 1,
      page: 0,
      limit: 10,
    });
  });

  it("Successfully get grouped orders - no orders", async () => {
    //Given no orders in database

    // Should be able to retrieve it

    const resultPaginated = await executeTask(
      inteM.r.orderRepository.paginatedGroupedOrders({
        page: 0,
        limit: 10,
        query: { side: OrderSideEnum.Buy },
      }),
    );

    expect(resultPaginated.count).toBe(0);
    expect(resultPaginated.data.length).toBe(0);
    expect(resultPaginated).toMatchObject({
      data: [],
      count: 0,
      page: 0,
      limit: 10,
    });
  });
});
