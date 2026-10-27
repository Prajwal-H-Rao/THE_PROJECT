/** The deny-list of forbidden operations. Spec §212. */

export type DeniedOperation =
  | "shell_execution"
  | "code_execution"
  | "arbitrary_sql"
  | "unrestricted_browser"
  | "unrestricted_fetch"
  | "filesystem_browsing"
  | "credential_extraction"
  | "secret_listing"
  | "policy_modification"
  | "container_socket_access"
  | "kubernetes_administration"
  | "plugin_installation"
  | "port_scanning"
  | "exploit_execution"
  | "anti_bot_bypass"
  | "captcha_bypass"
  | "arbitrary_file_read"
  | "arbitrary_file_write"
  | "image_deployment"
  | "pod_deployment"
  | "arbitrary_messaging";

export const DENIED_OPERATIONS: readonly DeniedOperation[] = [
  "shell_execution",
  "code_execution",
  "arbitrary_sql",
  "unrestricted_browser",
  "unrestricted_fetch",
  "filesystem_browsing",
  "credential_extraction",
  "secret_listing",
  "policy_modification",
  "container_socket_access",
  "kubernetes_administration",
  "plugin_installation",
  "port_scanning",
  "exploit_execution",
  "anti_bot_bypass",
  "captcha_bypass",
  "arbitrary_file_read",
  "arbitrary_file_write",
  "image_deployment",
  "pod_deployment",
  "arbitrary_messaging",
] as const;

export const DENIED_OPERATION_SET = new Set(DENIED_OPERATIONS);

/** Check if an operation is denied. Returns the denial code if denied, undefined if allowed. */
export function checkDenied(operation: string): DeniedOperation | undefined {
  return DENIED_OPERATION_SET.has(operation as DeniedOperation) ? (operation as DeniedOperation) : undefined;
}

/** Check if a tool name matches a denied operation pattern. */
export function checkToolNameDenied(toolName: string): DeniedOperation | undefined {
  // Check exact matches first
  const exactMatch = checkDenied(toolName);
  if (exactMatch) return exactMatch;

  // Check pattern matches for compound names (e.g., "shell.execute", "arbitrary.sql")
  const parts = toolName.split(/[._]/);
  if (parts.length >= 2) {
    const prefix = parts[0];
    const suffix = parts[1];
    
    // Check if prefix matches a denied prefix AND suffix matches the corresponding suffix
    for (const denied of DENIED_OPERATIONS) {
      const deniedPrefix = denied.split("_")[0];
      const deniedSuffix = denied.split("_")[1];
      if (parts[0] === deniedPrefix && parts[1] === deniedSuffix) {
        return denied;
      }
    }
  }
  return undefined;
}

/** Check if a request contains a denied operation in its arguments. */
export function checkArgumentsForDenied(arguments_: Record<string, unknown>): DeniedOperation | undefined {
  for (const [key, value] of Object.entries(arguments_)) {
    if (typeof value === "string") {
      // Check if the string contains any denied operation as a substring
      for (const denied of DENIED_OPERATIONS) {
        if (value.includes(denied)) {
          return denied;
        }
      }
    } else if (typeof value === "object" && value !== null) {
      const denied = checkArgumentsForDenied(value as Record<string, unknown>);
      if (denied) return denied;
    }
  }
  return undefined;
}

/** Typed denial response for denied operations. */
export interface DeniedResponse {
  readonly denied: true;
  readonly code: DeniedOperation;
  readonly reason: string;
}

/** Create a typed denial response. */
export function createDeniedResponse(code: DeniedOperation): DeniedResponse {
  return {
    denied: true,
    code,
    reason: `Operation '${code}' is denied per security policy`,
  };
}