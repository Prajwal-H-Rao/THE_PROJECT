/**
 * Telegram webhook route (task 14.8).
 * POST /webhooks/telegram - receives Telegram updates, validates the secret
 * token header, checks update_id deduplication, and forwards valid updates
 * to the inbox service for processing.
 * Spec:764 - validates the X-Telegram-Bot-Api-Secret-Token header.
 * Spec:765 - records update_id for deduplication, returns promptly.
 * Spec:766 - never binds Telegram numeric ID to NOVA account merely because
 * it states an email or username.
 */

import {
  Controller,
  Post,
  Req,
  Body,
  Inject,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { Validator } from "./validator.js";
import { OffsetStore } from "./offset-store.js";

const TELEGRAM_SECRET_TOKEN = "TELEGRAM_SECRET_TOKEN";

@Controller()
export class WebhookRoute {
  private readonly logger = new Logger(WebhookRoute.name);

  constructor(
    @Inject(TELEGRAM_SECRET_TOKEN) private readonly secretToken: string,
    private readonly validator: Validator,
    private readonly offsetStore: OffsetStore,
  ) {}

  /**
   * Handle a Telegram webhook update.
   * Validates the secret token, checks for duplicate update_id, and forwards
   * valid updates to the inbox service via internal API call.
   */
  @Post("webhooks/telegram")
  async handleWebhook(
    @Req() request: Request,
    @Body() update: unknown,
  ): Promise<{ ok: boolean }> {
    // Validate the secret token (spec:764)
    const secretToken = request.headers.get("x-telegram-bot-api-secret-token") ?? undefined;
    if (!this.validator.isValid(secretToken)) {
      this.logger.warn("Rejected webhook with invalid secret token");
      throw new UnauthorizedException("Invalid secret token");
    }

    // Extract update_id for deduplication (spec:765)
    const updateId = this.extractUpdateId(update);
    if (!updateId) {
      throw new UnauthorizedException("Missing update_id");
    }

    // Check for duplicate (spec:765)
    if (this.offsetStore.isDuplicate(updateId)) {
      this.logger.log(`Duplicate update_id ${updateId} - rejecting`);
      throw new ConflictException("Duplicate update");
    }

    // Forward to inbox service via internal API (spec:760 - not identity authority)
    await this.forwardToInbox(update, updateId);

    return { ok: true };
  }

  /**
   * Extract the update_id from a Telegram update object.
   * Telegram updates always have an update_id field at the top level.
   */
  private extractUpdateId(update: unknown): string | undefined {
    if (!update || typeof update !== "object") {
      return undefined;
    }
    const updateObj = update as Record<string, unknown>;
    const id = updateObj["update_id"];
    if (typeof id === "number" || typeof id === "string") {
      return String(id);
    }
    return undefined;
  }

  /**
   * Forward the update to the inbox service via internal API call.
   * The adapter never binds Telegram IDs to NOVA accounts directly
   * (spec:766) - that binding happens through the identity service.
   */
  private async forwardToInbox(update: unknown, updateId: string): Promise<void> {
    const inboxUrl = process.env.INBOX_SERVICE_URL ?? "http://inbox-service:8003";
    try {
      const response = await fetch(`${inboxUrl}/api/internal/inbox/webhook/telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(update),
      });

      if (!response.ok) {
        this.logger.error(
          `Inbox service returned ${response.status} for webhook ${updateId}`,
        );
        throw new InternalServerErrorException("Inbox service unavailable");
      }
    } catch (error) {
      this.logger.error(`Failed to forward webhook to inbox: ${error}`);
      throw new InternalServerErrorException("Inbox service unavailable");
    }
  }
}
