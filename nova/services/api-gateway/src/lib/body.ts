/** The capped body reader. It stops a body that is over the limit. */

/** The error that a body over the limit raises. */
export class BodyTooLargeError extends Error {}

/** Read the body of a request. It throws when the body is over the limit. */
export async function readBody(request: Request, limit: number): Promise<string> {
  const reader = request.body?.getReader();
  if (reader === undefined) {
    return "";
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const step = await reader.read();
    if (step.done === true) {
      break;
    }
    const chunk = step.value;
    if (chunk === undefined) {
      continue;
    }
    size += chunk.length;
    if (size > limit) {
      // WHY: the rest of the body must not reach the service.
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(chunk);
  }
  return new TextDecoder().decode(join(chunks, size));
}

/** Join the chunks of a body into one buffer. */
function join(chunks: readonly Uint8Array[], size: number): Uint8Array {
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return joined;
}
