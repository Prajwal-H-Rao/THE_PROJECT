/**
 * WhatsApp webhook route (tasks 14.2, 14.3, 14.4).
 * GET /webhooks/whatsapp - verify-token challenge: echoes back hub.challenge.
 * POST /webhooks/whatsapp - verifies HMAC-SHA256 signature over the raw body,
 * deduplicates message IDs, enforces replay protection, checks chat approvals against the low-risk allow-list, and forwards valid messages to the inbox service.
 * Spec:772 - verify webhook authenticity using HMAC-SHA256 over raw body.
 * Spec:773 - deduplicate inbound message IDs, enforce per-user rate limits.
 * Spec:774 - phone possession is not proof of NOVA account ownership.
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Body,
  Inject,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { SignatureValidator } from "./signature.js";
import { DedupStore } from "./dedup.js";
import { ReplayGuard } from "./replay.js";
import { classifyChatApproval } from "./webhook-handlers.js";
import { sanitiseMessageBody } from "./inbound-sanitiser.js";

const WHATSAPP_APP_SECRET = "WHATSAPP_APP_SECRET";

@Controller()
export class WebhookRoute {
  private readonly logger = new Logger(WebhookRoute.name);

  constructor(
    @Inject(WHATSAPP_APP_SECRET) private readonly appSecret: string,
    private readonly signatureValidator: SignatureValidator,
    private readonly dedupStore: DedupStore,
    private readonly replayGuard: ReplayGuard,
  ) {}

  /**
   * GET /webhooks/whatsapp - WhatsApp webhook verification challenge.
   * Echoes back hub.challenge to verify the webhook endpoint.
   */
  @Get("webhooks/whatsapp")
  handleChallenge(@Query("hub.challenge") challenge: string | undefined): string {
    if (!challenge) {
      throw new UnauthorizedException("Missing hub.challenge");
    }
    return challenge;
  }

  /**
   * POST /webhooks/whatsapp - receive inbound WhatsApp messages.
   * Verifies HMAC-SHA256 signature, deduplicates message IDs,
   * enforces replay protection, and forwards valid messages.
   */
  @Post("webhooks/whatsapp")
  async handleWebhook(
    @Req() request: Request,
    @Body() rawBody: Buffer | string,
  ): Promise<{ ok: boolean }> {
    // Verify the signature (spec:772)
    const signature = request.headers.get("x-hub-signature-256") ?? undefined;
    if (!this.signatureValidator.isValid(rawBody, signature)) {
      this.logger.warn("Rejected webhook with invalid signature");
      throw new UnauthorizedException("Invalid signature");
    }

    const body =
      typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;

    // Extract message ID for deduplication (spec:773)
    const messageId = this.extractMessageId(body);
    if (!messageId) {
      throw new UnauthorizedException("Missing message ID");
    }

    // Check for duplicate (spec:773)
    if (this.dedupStore.isDuplicate(messageId)) {
      this.logger.log(`Duplicate message_id ${messageId} - rejecting`);
      throw new ConflictException("Duplicate message");
    }

    // Check replay protection (spec:773)
    const timestampMs = this.extractTimestampMs(body);
    if (timestampMs !== undefined && !this.replayGuard.isWithinWindow(timestampMs)) {
      this.logger.warn(`Replayed message ${messageId} - timestamp outside window`);
      throw new UnauthorizedException("Message timestamp outside window");
    }

    // Chat approval allow-list (task 14.12): high-risk callbacks route to the web surface instead of inbox processing.
    const decision = classifyChatApproval(body);
    if (decision.routeToWeb) {
      this.logger.log(`Callback ${decision.action} routed to web surface: ${decision.reason}`);
      return {
        ok: true,
        routedToWeb: true,
        action: decision.action,
        reason: decision.reason,
      } as { ok: boolean; routedToWeb: boolean; action: string; reason: string };
    }

    // Forward to inbox service via internal API (spec:760)
    await this.forwardToInbox(body);

    return { ok: true };
  }

  /**
   * Extract the message ID from a WhatsApp webhook payload.
   */
  private extractMessageId(body: unknown): string | undefined {
    if (!body || typeof body !== "object") {
      return undefined;
    }
    const obj = body as Record<string, unknown>;
    const entry = obj["entry"];
    if (!Array.isArray(entry) || entry.length === 0) {
      return undefined;
    }
    const changes = (entry[0] as Record<string, unknown>)?.["changes"];
    if (!Array.isArray(changes) || changes.length === 0) {
      return undefined;
    }
    const value = (changes[0] as Record<string, unknown>)?.["value"] as Record<string, unknown>;
    const messages = value["messages"] as unknown[];
    if (!Array.isArray(messages) || messages.length === 0) {
      return undefined;
    }
    const message = messages[0] as Record<string, unknown>;
    return (message["id"] as string) || undefined;
  }

  /**
   * Extract the timestamp from a WhatsApp webhook payload.
   */
  private extractTimestampMs(body: unknown): number | undefined {
    if (!body || typeof body !== "object") {
      return undefined;
    }
    const obj = body as Record<string, unknown>;
    const entry = obj["entry"];
    if (!Array.isArray(entry) || entry.length === 0) {
      return undefined;
    }
    const changes = (entry[0] as Record<string, unknown>)?.["changes"];
    if (!Array.isArray(changes) || changes.length === 0) {
      return undefined;
    }
    const value = (changes[0] as Record<string, unknown>)?.["value"] as Record<string, unknown>;
    const messages = value["messages"] as unknown[];
    if (!Array.isArray(messages) || messages.length === 0) {
      return undefined;
    }
    const message = messages[0] as Record<string, unknown>;
    const timestamp = message["timestamp"];
    if (typeof timestamp === "string") {
      return parseInt(timestamp, 10) * 1000;
    }
    if (typeof timestamp === "number") {
      return timestamp;
    }
    return undefined;
  }

  /**
   * Forward the message to the inbox service via internal API (spec:760).
   */
  private async forwardToInbox(message: unknown): Promise<void> {
    const sanitisedBody = this.sanitiseMessageBody(message);
    const inboxUrl = process.env.INBOX_SERVICE_URL ?? "http://inbox-service:8003";
    try {
      const response = await fetch(`${inboxUrl}/api/internal/inbox/webhook/whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitisedBody),
      });

      if (!response.ok) {
        this.logger.error(
          `Inbox service returned ${response.status} for webhook`,
        );
        throw new InternalServerErrorException("Inbox service unavailable");
      }
    } catch (error) {
      this.logger.error(`Failed to forward webhook to inbox: ${error}`);
      throw new InternalServerErrorException("Inbox service unavailable");
    }
  }

  /**
   * Sanitise text fields in a WhatsApp message body before forwarding.
   * Recursively walks JSON object and sanitises all string values.
   */
  private sanitiseMessageBody(body: unknown): unknown {
    if (typeof body === "string") {
      return sanitiseMessageBody(body).text;
    }
    if (Array.isArray(body)) {
      return body.map((item) => this.sanitiseMessageBody(item));
    }
    if (body !== null && typeof body === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body)) {
        result[key] = this.sanitiseMessageBody(value);
      }
      return result;
    }
    return body;
  }
}
