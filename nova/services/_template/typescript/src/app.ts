/** The service application. It serves the health endpoints and nothing else. */
import { createServer } from "node:http";
import type { Server } from "node:http";

import { handleHealth } from "./health.js";
import { loadSettings } from "./settings.js";

/** Create the service. It does not listen yet. */
export function createService(): Server {
  return createServer((request, response) => {
    if (handleHealth(request, response)) {
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });
}

/** Start the service. It returns the running server. */
export function start(): Server {
  const server = createService();
  server.listen(loadSettings().port);
  return server;
}
