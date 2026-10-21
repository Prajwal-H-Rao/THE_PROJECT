/** The settings of one service. The environment supplies the values. */
export interface Settings {
  readonly serviceName: string;
  readonly logLevel: string;
  readonly port: number;
}

/** The default settings. The environment overrides them. */
export const defaultSettings: Settings = {
  serviceName: "service-template",
  logLevel: "info",
  port: 8000,
};

/** Return the settings that the environment holds. */
export function loadSettings(env: NodeJS.ProcessEnv = process.env): Settings {
  const port = Number(env.NOVA_PORT ?? defaultSettings.port);
  return {
    serviceName: env.NOVA_SERVICE_NAME ?? defaultSettings.serviceName,
    logLevel: env.NOVA_LOG_LEVEL ?? defaultSettings.logLevel,
    port: Number.isInteger(port) && port > 0 ? port : defaultSettings.port,
  };
}
