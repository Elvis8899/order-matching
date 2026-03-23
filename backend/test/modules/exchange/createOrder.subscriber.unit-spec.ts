import { getQueueToken } from "@nestjs/bullmq";
import { CqrsModule } from "@nestjs/cqrs";
import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { FakeOrderRepository } from "@src/modules/exchange/database/fakeOrder.repository";
import { FakeWalletRepository } from "@src/modules/exchange/database/fakeWallet.repository";
import { OrderRepository } from "@src/modules/exchange/database/order.repository.port";
import { WalletRepository } from "@src/modules/exchange/database/wallet.repository.port";
import {
  ORDER_CREATED,
  OrderCreatedEvent,
} from "@src/modules/exchange/domain/events/orderCreated.event";
import { CreateOrderSubscriber } from "@src/modules/exchange/subscribers/createOrder.subscriber";
import { QueueNames } from "@src/modules/shared/queue/queue.config";
import { OrderBuilder } from "@test/data-builders/orderBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";

const exampleQueueMock = { add: jest.fn() };

describe("[Unit] Endpoint Response - Subscriber", () => {
  const modRef = new UnitModule(
    {
      imports: [CqrsModule, DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        CreateOrderSubscriber,
        { provide: OrderRepository, useClass: FakeOrderRepository },
        { provide: WalletRepository, useClass: FakeWalletRepository },
        {
          provide: getQueueToken(QueueNames.ORDER_QUEUE),
          useValue: exampleQueueMock,
        },
      ],
    },
    (ref) => ({
      walletRepository: ref.get(WalletRepository),
      orderRepository: ref.get(OrderRepository),
      eventPublisher: ref.get(DomainEventPublisher),
      createOrderSubscriber: ref.get(CreateOrderSubscriber),
    }),
  );

  beforeEach(async () => {
    await modRef.init();
    exampleQueueMock.add.mockClear();
  });

  it("Should not return error", async () => {
    // Given a valid saved order
    const order = new OrderBuilder().build();
    await executeTask(modRef.r.orderRepository.save(order));

    // And a valid event
    const responseWatcherEvent = OrderCreatedEvent.parse({
      eventKey: ORDER_CREATED,
      payload: {
        id: order.id,
      },
    });
    //When the function is called
    const resultPromise = modRef.r.createOrderSubscriber.afterOrderCreatedEvent(
      responseWatcherEvent.payload,
    );

    //Then it should resolve to undefined
    await expect(resultPromise).resolves.toBe(undefined);

    //Then it should have emitted an event
    expect(exampleQueueMock.add).toHaveBeenCalledTimes(1);
  });
});
