/** The ready health route of the gateway. It leaks no secret. */

import { readyBody } from "@/lib/health";

/** Answer that the service accepts traffic. */
export function GET(): Response {
  return Response.json(readyBody());
}
