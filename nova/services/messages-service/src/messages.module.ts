/**
 * Nova design system - Messages module.
 */

import { Module } from "@nestjs/common";
import { MessageRepository } from "./message.service.js";
import { MessageService } from "./message.service.js";

@Module({
  providers: [MessageRepository, MessageService],
  exports: [MessageService],
})
export class MessagesModule {}
