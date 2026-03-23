import { BullRootModuleOptions } from "@nestjs/bullmq";
import { get } from "env-var";

export enum QueueNames {
  ORDER_QUEUE = "order-queue",
}

export const JobNames = {
  NEW_ORDER: "new-order",
};

type QueueEnv = {
  // useTls: boolean;
  host: string;
  port: number;
  password: string | undefined;
  db: number;
  defaultAttempts: number;
};

const queueEnv: QueueEnv = {
  // useTls: get("REDIS_USE_TLS").default("false").asBool(),
  host: get("REDIS_HOST").default("cache").asString(),
  port: get("REDIS_PORT").default(6379).asInt(),
  password: get("REDIS_PASSWORD").asString() || undefined,
  db: get("REDIS_DB").default(0).asInt(),
  defaultAttempts: get("QUEUE_DEFAULT_ATTEMPTS").default(4).asInt(),
};

export const bullRootModuleOptions: BullRootModuleOptions = {
  connection: {
    host: queueEnv.host,
    port: queueEnv.port,
    password: queueEnv.password,
    db: queueEnv.db,
    // ...(queueEnv.useTls && { tls: {} }),
  },
  defaultJobOptions: {
    attempts: queueEnv.defaultAttempts,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600, count: 1000 },
  },
};
