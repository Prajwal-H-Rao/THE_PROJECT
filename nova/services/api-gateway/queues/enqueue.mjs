/**
 * The enqueue script of the restart test. It adds one echo job with an opaque
 * payload and prints the job id. The verify script reads the same job after the
 * broker restarts.
 */

import { connectionOf, closeQueue, ECHO_JOB_NAME, opaquePayload, openQueue } from "./queue.mjs";

const RECORD_PREFIX = "ENQUEUE";

/** Add the echo job and answer through the process exit code. */
async function main() {
  let queue;
  try {
    queue = openQueue(connectionOf());
    const id = "echo-" + opaquePayload().slice(0, 8).toLowerCase();
    const payload = opaquePayload();
    const job = await queue.add(ECHO_JOB_NAME, { payload }, { jobId: id });
    console.log(
      RECORD_PREFIX + " job=" + String(job.id) + " name=" + ECHO_JOB_NAME
        + " bytes=" + String(payload.length) + " payload=" + payload,
    );
    await closeQueue(queue);
    process.exit(0);
  } catch (error) {
    console.log(RECORD_PREFIX + " output=failed reason=" + briefReason(error));
    if (queue !== undefined) {
      await closeQueue(queue);
    }
    process.exit(1);
  }
}

/** Return the message of one error without its stack. */
function briefReason(error) {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/\s+/g, " ").slice(0, 120);
}

main();
