/**
 * Nova design system - Account connections (task 11.11, module 11).
 * Provider connection handling and account-linking consent inside the
 * finance service. Consent scope is explicit: a connection only grants
 * the scopes it was created with, and revoking removes consent.
 * Pure stdlib, no pg, no credentials. No movement of money.
 */

export interface AccountConnection {
  readonly connectionId: string;
  readonly userId: string;
  readonly provider: string;        // e.g. "plaid", "aa"
  readonly providerAccountId: string;
  consentScope: string;    // e.g. "transactions.read"
  readonly connectedAt: string;     // ISO timestamp
  revokedAt: string | null;         // null when active, set when revoked
  status: "active" | "revoked";     // changes on revoke
}

const connections: AccountConnection[] = [];

// Purpose: generate a deterministic connection id from user + provider + account.
function connectionId(userId: string, provider: string, providerAccountId: string): string {
  return `conn:${userId}:${provider}:${providerAccountId}`;
}

// Purpose: connect an account with an explicit consent scope. Idempotent:
// connecting the same provider+account for the same user returns the
// existing active connection (no duplicate connections).
export function connectAccount(
  userId: string,
  provider: string,
  providerAccountId: string,
  consentScope: string,
): AccountConnection {
  const id = connectionId(userId, provider, providerAccountId);
  const existing = connections.find(
    (c) => c.connectionId === id,
  );
  if (existing) {
    existing.revokedAt = null;
    existing.status = "active";
    existing.consentScope = consentScope;
    return existing;
  }
  const now = new Date().toISOString();
  const conn: AccountConnection = {
    connectionId: id,
    userId,
    provider,
    providerAccountId,
    consentScope,
    connectedAt: now,
    revokedAt: null,
    status: "active",
  };
  connections.push(conn);
  return conn;
}

// Purpose: revoke a connection, marking it revoked with a timestamp.
// Returns the revoked connection, or null if not found.
export function revokeAccount(connectionId: string): AccountConnection | null {
  const conn = connections.find((c) => c.connectionId === connectionId);
  if (!conn) {
    return null;
  }
  conn.revokedAt = new Date().toISOString();
  conn.status = "revoked";
  return conn;
}

// Purpose: list all active (non-revoked) connections for a user.
export function listConnections(userId: string): AccountConnection[] {
  return connections.filter(
    (c) => c.userId === userId && c.status === "active",
  );
}

// Purpose: check whether the user has an active consent for the given
// provider and scope. Returns false if no connection exists, or if the
// connection is revoked, or if the scope does not match.
export function hasConsent(
  userId: string,
  provider: string,
  scope: string,
): boolean {
  const conn = connections.find(
    (c) =>
      c.userId === userId &&
      c.provider === provider &&
      c.status === "active",
  );
  if (!conn) {
    return false;
  }
  return conn.consentScope === scope;
}
