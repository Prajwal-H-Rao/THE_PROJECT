/**
 * The shared queue connection of the gateway. It holds one queue with one client.
 */

import { randomBytes } from "node:crypto";

import { Queue } from "bullmq";

/** The name of the single BullMQ queue that module 01 owns. */
export const QUEUE_NAME = "nova-jobs";

/** The name of the echo job that the restart test enqueues. */
export const ECHO_JOB_NAME = "echo";

/** The random length of the opaque payload in bytes. */
const PAYLOAD_BYTES = 32;

/** Build the connection options of the broker from the environment. */
export function connectionOf(env = process.env) {
  const password = env.NOVA_REDIS_PASSWORD ?? "";
  if (password === "") {
    // WHY: the broker rejects the anonymous client. A named gap beats a cryptic
    // connection error inside the queue library.
    throw new Error("the queue runner holds no NOVA_REDIS_PASSWORD");
  }
  return {
    host: env.NOVA_REDIS_HOST ?? "redis",
    port: Number(env.NOVA_REDIS_PORT ?? "6379"),
    password,
  };
}

/** Open the queue. The runner runs one script per container, so one queue is enough. */
export function openQueue(connection) {
  return new Queue(QUEUE_NAME, {
    connection,
    // WHY: no worker needs an event stream here. The scripts answer on their own.
    defaultJobOptions: { removeOnComplete: false, removeOnFail: false },
  });
}

/** Return one opaque payload. The gateway names no field of any job payload. */
export function opaquePayload() {
  return randomBytes(PAYLOAD_BYTES).toString("base64");
}

/** Close the queue and its shared socket. The script exits only after the close. */
export async function closeQueue(queue) {
  await queue.close();
}
