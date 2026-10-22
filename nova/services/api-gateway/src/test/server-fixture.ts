/** The test server helper. It runs the built gateway on a free port. */

import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";

import axios from "axios";

/** The secret that the tests use. It holds more than 32 bytes. */
export const TEST_SECRET = "test-secret-for-the-gateway-000000";

/** The origin that the tests allow. */
export const TEST_ORIGIN = "https://app.nova.test";

/** The root of the service. The tests run from its build output. */
export const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** The Next.js binary of the service. */
const NEXT_BIN = fileURLToPath(new URL("../../node_modules/next/dist/bin/next", import.meta.url));

/** The time that the server gets to answer. */
const READY_TIMEOUT_MS = 30_000;

/** The time that the server gets to stop. */
const STOP_TIMEOUT_MS = 5_000;

/** The running gateway of one test. */
export interface Gateway {
  readonly baseUrl: string;
  readonly stop: () => Promise<void>;
}

/** Start the gateway on a free port. It waits until the server answers. */
export async function startGateway(env: Record<string, string | undefined> = {}): Promise<Gateway> {
  const port = await freePort();
  const childEnv = {
    ...process.env,
    NODE_ENV: "production",
    NOVA_SESSION_SECRET: TEST_SECRET,
    NOVA_ALLOWED_ORIGINS: TEST_ORIGIN,
    ...env,
  } as NodeJS.ProcessEnv;
  const child = spawn(
    process.execPath,
    [NEXT_BIN, "start", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: APP_ROOT,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    },
  );
  const baseUrl = "http://127.0.0.1:" + String(port);
  try {
    await waitUntilReady(baseUrl, child);
  } catch (error) {
    // WHY: a server that never became ready must not stay alive.
    await stopServer(child);
    throw error;
  }
  return { baseUrl, stop: () => stopServer(child) };
}

/** Return a free port. */
export async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  const port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

/** Wait until the server answers the live health route. */
async function waitUntilReady(baseUrl: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  for (;;) {
    if (child.exitCode !== null) {
      throw new Error("the gateway server stopped. Run npm run build before npm test");
    }
    try {
      const response = await axios.get(baseUrl + "/health/live", {
        timeout: 1000,
        validateStatus: () => true,
      });
      if (response.status === 200) {
        return;
      }
      // WHY: the server answered but it is not ready. The server did not start.
      throw new Error("the gateway server answered " + String(response.status) + ". The server is not ready");
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("the gateway server answered")) {
        throw error;
      }
      // WHY: the server is not up yet. The loop tries again.
    }
    if (Date.now() > deadline) {
      throw new Error("the gateway server did not answer in time");
    }
    await delay(200);
  }
}

/** Stop the server and its worker. */
function stopServer(child: ChildProcess): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      killGroup(child, "SIGKILL");
      resolve();
    }, STOP_TIMEOUT_MS);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    killGroup(child, "SIGTERM");
  });
}

/** Kill the process group of the server. The CLI spawns a worker. */
function killGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined) {
    child.kill(signal);
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

/** Wait for the given number of milliseconds. */
export function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
