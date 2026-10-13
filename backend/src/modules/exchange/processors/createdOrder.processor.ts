import { FindMatch } from "@exchange/commands/findMatch/findMatch.command";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { QueueNames } from "@shared/queue/queue.config";
import { Job } from "bullmq";
import { PinoLogger } from "nestjs-pino";

type JobType = Job<{ id: string }>;
@Processor(QueueNames.ORDER_QUEUE, { concurrency: 1 })
@Injectable()
export class CreatedOrderProcessor extends WorkerHost {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.setContext(CreatedOrderProcessor.name);
  }

  getJobId(job?: JobType) {
    return job?.id || job?.data.id || "undefined";
  }

  // Main work
  async process(job: JobType): Promise<{ ok: boolean }> {
    this.logger.info(`Processing job ${this.getJobId(job)} for ${job.data.id}`);
    await job.updateProgress(10);
    // Simulate sending a welcome email (replace with real provider call)
    const command = new FindMatch({ id: job.data.id });
    await this.commandBus.execute(command);

    await job.updateProgress(100);
    this.logger.info(`Completed job ${this.getJobId(job)}`);
    return { ok: true };
  }

  @OnWorkerEvent("active")
  onActive(job: JobType) {
    this.logger.info(`Event: active jobId=${this.getJobId(job)}`);
  }

  @OnWorkerEvent("stalled")
  onStalled(job: JobType) {
    this.logger.warn(`Event: stalled jobId=${this.getJobId(job)}`);
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
  onFailed(job: JobType | undefined, err: Error) {
    const id = this.getJobId(job);
    const attemptsMade = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts.attempts ?? 1; // we set attempts on each job in the producer

    this.logger.error(
      `Event: failed jobId=${id} attemptsMade=${String(attemptsMade)}/${String(maxAttempts)} err=${err.message}`,
    );
  }
}
