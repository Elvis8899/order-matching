import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import {
  JobNames,
  QueueNames,
} from "@src/modules/shared/queue/queue.constants";
import { JobsOptions, Queue } from "bullmq";

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QueueNames.ORDER_QUEUE)
    private readonly appointmentQueue: Queue,
  ) {}

  async addAppointmentJob(
    data: { userId: string; email: string; name: string },
    opts?: JobsOptions,
  ) {
    // Idempotency via jobId (prevents duplicates)
    const jobId = opts?.jobId ?? `welcome${data.email}`;
    return this.appointmentQueue.add(JobNames.NEW_ORDER, data, {
      jobId,
      attempts: 4, // ensure attempts is set on the job so DLQ logic can read it
      backoff: { type: "exponential", delay: 3000 },
      ...opts,
    });
  }
}
