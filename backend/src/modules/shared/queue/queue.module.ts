import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { bullQueueConfig } from "@src/modules/shared/queue/bull.config";
import { QueueNames } from "@src/modules/shared/queue/queue.constants";
// import { AppointmentProcessor } from "./processors/appointment.processor";
// import { DlqProcessor } from "./processors/dlq.processor";
// import { QueueNames } from "./queue.constants";
// import { QueueService } from "./queue.service";

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

@Module({
  imports: [BullModule.forRootAsync(bullQueueConfig), ...queues],
  providers: [],
  exports: [...queues],
})
export class QueueModule {}
