import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { FindMatch } from "@src/modules/exchange/commands/findMatch/findMatch.command";
import { QueueNames } from "@src/modules/shared/queue/queue.config";
import { Job } from "bullmq";
import { PinoLogger } from "nestjs-pino";

@Processor(QueueNames.ORDER_QUEUE)
@Injectable()
export class OrderCreatedProcessor extends WorkerHost {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.setContext(OrderCreatedProcessor.name);
  }

  // Main work
  async process(job: Job<{ id: string }>): Promise<{ ok: boolean }> {
    this.logger.info(`Processing job ${job.id || ""} for ${job.data.id}`);
    await job.updateProgress(10);
    // Simulate sending a welcome email (replace with real provider call)
    const command = new FindMatch({ id: job.data.id });
    await this.commandBus.execute(command);

    await job.updateProgress(100);
    this.logger.info(`Completed job ${job.id || ""}`);
    return { ok: true };
  }

  @OnWorkerEvent("active")
  onActive(job: Job) {
    this.logger.info(`Event: active jobId=${job.id || ""}`);
  }

  @OnWorkerEvent("stalled")
  onStalled(job: Job) {
    this.logger.warn(`Event: stalled jobId=${job.id || ""}`);
  }

  @OnWorkerEvent("paused")
  onPaused() {
    this.logger.warn("Event: worker paused");
  }

  @OnWorkerEvent("resumed")
  onResumed() {
    this.logger.info("Event: worker resumed");
  }

  @OnWorkerEvent("drained")
  onDrained() {
    this.logger.info("Event: worker drained");
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, err: Error) {
    const id = job?.id ?? "unknown";
    const attemptsMade = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts.attempts ?? 1; // we set attempts on each job in the producer

    this.logger.error(
      `Event: failed jobId=${id} attemptsMade=${String(attemptsMade)}/${String(maxAttempts)} err=${err.message}`,
    );

    // **DLQ routing**: only when attempts exhausted (poison job)
    // if (job && attemptsMade >= maxAttempts) {
    //   await this.routeToDLQ(job, err);
    // }
  }
}
