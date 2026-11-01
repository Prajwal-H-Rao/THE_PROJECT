/**
 * Nova design system - Reminders module.
 * Wires ReminderRepository, ReminderDeliveryRepository, EscalationRepository,
 * ReminderService.
 */

import { Module } from "@nestjs/common";
import { ReminderRepository } from "./reminder-repository.js";
import { ReminderDeliveryRepository } from "./reminder-delivery.js";
import { ReminderDeliveryLogRepository } from "./reminder-delivery-log.js";
import { EscalationRepository } from "./escalation-repository.js";
import { ReminderService } from "./reminder.service.js";
import { EscalationService } from "./escalation-service.js";

@Module({
  providers: [
    ReminderRepository,
    ReminderDeliveryRepository,
    ReminderDeliveryLogRepository,
    EscalationRepository,
    ReminderService,
    EscalationService,
  ],
  exports: [
    ReminderService,
    ReminderRepository,
    ReminderDeliveryRepository,
    ReminderDeliveryLogRepository,
    EscalationService,
    EscalationRepository,
  ],
})
export class RemindersModule {}
