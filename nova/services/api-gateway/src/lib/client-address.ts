/** The client address of a request. */

/** The address that stands for a request with no trusted address. */
export const UNKNOWN_ADDRESS = "unknown";

/** Return the client address of a request. */
export function clientAddress(request: Request, hops: number): string {
  if (hops < 1) {
    // WHY: without a trusted proxy the header holds the value of the client. It says nothing.
    return UNKNOWN_ADDRESS;
  }
  const header = request.headers.get("x-forwarded-for");
  if (header === null) {
    return UNKNOWN_ADDRESS;
  }
  const entries = header.split(",").map((item) => item.trim()).filter((item) => item !== "");
  if (entries.length === 0) {
    return UNKNOWN_ADDRESS;
  }
  // WHY: the entry at the hop count from the right is the address that the proxy appended.
  const index = entries.length - hops;
  const address = entries[index];
  return address === undefined ? UNKNOWN_ADDRESS : address;
}
