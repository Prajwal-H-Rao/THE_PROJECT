/**
 * GmailAdapter interface for inbox operations.
 * Defines list, get, search, draft and send operations on Gmail messages.
 * Mock transport is used because Gmail OAuth credentials are barred from source.
 */

export interface GmailMessage {
  readonly id: string;
  readonly threadId: string | null;
  readonly from: string;
  readonly to: readonly string[];
  readonly subject: string;
  readonly snippet: string;
  readonly receivedAt: string;
  readonly labels: readonly string[];
  readonly bodyRef: string | null;
}

export interface GmailListResult {
  readonly messages: readonly GmailMessage[];
  readonly total: number;
  readonly nextPageToken: string | null;
}

export interface GmailGetResult {
  readonly message: GmailMessage;
}

export interface GmailSearchResult {
  readonly messages: readonly GmailMessage[];
  readonly total: number;
}

export interface DraftResult {
  readonly draftId: string;
}

export interface SendResult {
  readonly messageId: string;
}

export interface DraftData {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
}

export interface GmailAdapter {
  list(userId: string, query?: string, limit?: number, pageToken?: string): Promise<GmailListResult>;
  get(userId: string, messageId: string): Promise<GmailGetResult>;
  search(userId: string, query: string, limit?: number): Promise<GmailSearchResult>;
  draft(userId: string, to: string, subject: string, body: string): Promise<DraftResult>;
  send(userId: string, draftId: string): Promise<SendResult>;
}

export interface GmailAdapterOptions {
  readonly userId: string;
  readonly accessToken?: string;
}

export interface MockGmailAdapter extends GmailAdapter {
  addMessage(raw: Record<string, unknown>): string;
  getDraft(draftId: string): DraftData | null;
  getSent(messageId: string): SendResult | null;
}

export function createMockGmailAdapter(opts: GmailAdapterOptions): MockGmailAdapter {
  const messages: Map<string, GmailMessage> = new Map();
  const drafts: Map<string, DraftData> = new Map();
  const sent: Map<string, SendResult> = new Map();

  function toMessage(raw: Record<string, unknown>, id: string): GmailMessage {
    return {
      id,
      threadId: (raw.threadId as string | null) ?? null,
      from: String(raw.from ?? ""),
      to: Array.isArray(raw.to) ? (raw.to as readonly string[]) : [],
      subject: String(raw.subject ?? ""),
      snippet: String(raw.snippet ?? ""),
      receivedAt: String(raw.receivedAt ?? new Date().toISOString()),
      labels: Array.isArray(raw.labels) ? (raw.labels as readonly string[]) : [],
      bodyRef: (raw.bodyRef as string | null) ?? null,
    };
  }

  const adapter: MockGmailAdapter = {
    async list(userId, query = "", limit = 20, pageToken) {
      const all = Array.from(messages.values()).filter((m) => m.from.includes(query) || m.subject.includes(query));
      const start = pageToken ? Number(pageToken) : 0;
      const page = all.slice(start, start + limit);
      const next = start + limit < all.length ? String(start + limit) : null;
      return {
        messages: page,
        total: all.length,
        nextPageToken: next,
      };
    },

    async get(userId, messageId) {
      const msg = messages.get(messageId);
      if (!msg) {
        throw new Error(`Message not found: ${messageId}`);
      }
      return { message: msg };
    },

    async search(userId, query, limit = 20) {
      const results = Array.from(messages.values()).filter(
        (m) => m.from.includes(query) || m.subject.includes(query) || m.snippet.includes(query)
      );
      return { messages: results.slice(0, limit), total: results.length };
    },

    async draft(userId, to, subject, body) {
      const draftId = `draft-${crypto.randomUUID()}`;
      drafts.set(draftId, { to, subject, body });
      return { draftId };
    },

    async send(userId, draftId) {
      const draft = drafts.get(draftId);
      if (!draft) {
        throw new Error(`Draft not found: ${draftId}`);
      }
      const messageId = `msg-${crypto.randomUUID()}`;
      sent.set(messageId, { messageId });
      return { messageId };
    },

    addMessage(raw: Record<string, unknown>) {
      const id = String(raw.id ?? crypto.randomUUID());
      messages.set(id, toMessage(raw, id));
      return id;
    },

    getDraft(draftId: string): DraftData | null {
      return drafts.get(draftId) ?? null;
    },

    getSent(messageId: string): SendResult | null {
      return sent.get(messageId) ?? null;
    },
  };

  return adapter;
}
