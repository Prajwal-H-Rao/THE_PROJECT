/** The service application. It serves the health endpoints and nothing else. */
import { createServer } from "node:http";

import { handleHealth } from "./health.js";
import { loadSettings } from "./settings.js";

/** Start the service. It returns the running server. */
export function start(): ReturnType<typeof createServer> {
  const settings = loadSettings();
  const server = createServer((request, response) => {
    if (handleHealth(request, response)) {
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });
  server.listen(settings.port);
  return server;
}
