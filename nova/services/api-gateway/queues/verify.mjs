/**
 * The verify script of the restart test. It reads the echo job by its id and
 * checks that its opaque payload came back unchanged. The check answers through
 * the process exit code and one record line.
 */

import { decodeEnvelope } from "./envelope.mjs";
import { connectionOf, closeQueue, ECHO_JOB_NAME, openQueue } from "./queue.mjs";

const RECORD_PREFIX = "VERIFY";

// Usage: node verify.mjs <job-id> <expected-payload>
/** Read the job and compare the payloads. The exit code carries the verdict. */
async function main() {
  const [jobId, expected] = process.argv.slice(2);
  if (typeof jobId !== "string" || typeof expected !== "string") {
    console.log(RECORD_PREFIX + " output=failed reason=usage");
    process.exit(1);
  }
  let queue;
  try {
    queue = openQueue(connectionOf());
    const job = await queue.getJob(jobId);
    if (job === null || job === undefined) {
      console.log(RECORD_PREFIX + " job=" + jobId + " outcome=missing reason=job_absent");
      await closeQueue(queue);
      process.exit(1);
    }
    if (job.name !== ECHO_JOB_NAME) {
      console.log(RECORD_PREFIX + " job=" + jobId + " outcome=missing reason=wrong_name");
      await closeQueue(queue);
      process.exit(1);
    }
    const data = /** @type {{ payload?: unknown }} */ (job.data);
    if (data.payload !== expected) {
      console.log(RECORD_PREFIX + " job=" + jobId + " outcome=missing reason=payload_changed");
      await closeQueue(queue);
      process.exit(1);
    }
    // WHY: the decoded token carries the correlation id of the trace. Echoing it
    // lets the restart step prove that one id spans the broker intact.
    const decoded = decodeEnvelope(expected);
    const traceId = decoded !== null ? decoded.correlation_id : "";
    console.log(
      RECORD_PREFIX + " job=" + String(job.id) + " state=" + String(await job.getState())
        + " trace=" + traceId + " outcome=payload_intact",
    );
    await closeQueue(queue);
    process.exit(0);
  } catch (error) {
    console.log(RECORD_PREFIX + " job=" + String(jobId) + " outcome=missing reason="
      + briefReason(error));
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
