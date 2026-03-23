import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import {
  bullRootModuleOptions,
  QueueNames,
} from "@src/modules/shared/queue/queue.config";

const queues = [
  BullModule.registerQueue({
    name: QueueNames.ORDER_QUEUE,
    // per-queue defaults (can override root defaults)
    defaultJobOptions: {
      attempts: 4,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: { age: 1800, count: 500 },
      removeOnFail: { age: 24 * 3600, count: 1000 },
    },
  }),
];

export const BullQueueModule = BullModule.forRoot(bullRootModuleOptions);

@Module({
  imports: [BullQueueModule, ...queues],
  providers: [],
  exports: [...queues],
})
export class QueueModule {}
