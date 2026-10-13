import {
  ORDER_CREATED,
  OrderCreatedEvent,
} from "@exchange/domain/events/orderCreated.event";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { JobNames, QueueNames } from "@shared/queue/queue.config";
import { Queue } from "bullmq";

@Injectable()
export class CreateOrderSubscriber {
  constructor(
    @InjectQueue(QueueNames.ORDER_QUEUE)
    private readonly orderQueue: Queue,
  ) {}

  @OnEvent(ORDER_CREATED)
  async afterOrderCreatedEvent(
    payload: OrderCreatedEvent["payload"],
  ): Promise<void> {
    const jobId = "newOrder" + payload.id;
    await this.orderQueue.add(JobNames.NEW_ORDER, payload, {
      jobId,
      attempts: 4,
      backoff: { type: "exponential", delay: 3000 },
      // ...opts,
    });
  }
}
