import { WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

export class FakeOrderCreatedProcessor extends WorkerHost {
  // Main work
  async process(_: Job<{ id: string }>): Promise<{ ok: boolean }> {
    return Promise.resolve({ ok: true });
  }
}
