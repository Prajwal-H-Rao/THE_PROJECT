/**
 * Nova design system - Reminders module.
 * Wires ReminderRepository, ReminderDeliveryRepository, ReminderService.
 */

import { Module } from "@nestjs/common";
import { ReminderRepository } from "./reminder-repository.js";
import { ReminderDeliveryRepository } from "./reminder-delivery.js";
import { ReminderService } from "./reminder.service.js";

@Module({
  providers: [ReminderRepository, ReminderDeliveryRepository, ReminderService],
  exports: [ReminderService, ReminderRepository, ReminderDeliveryRepository],
})
export class RemindersModule {}
