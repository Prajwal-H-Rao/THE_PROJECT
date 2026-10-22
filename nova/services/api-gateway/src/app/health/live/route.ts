/** The live health route of the gateway. It leaks no secret. */

import { liveBody } from "@/lib/health";

/** Answer that the process runs. */
export function GET(): Response {
  return Response.json(liveBody());
}
