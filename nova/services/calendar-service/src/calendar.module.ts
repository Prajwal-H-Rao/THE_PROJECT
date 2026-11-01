/**
 * Nova design system - Calendar module.
 */

import { Module } from "@nestjs/common";
import { CalendarEventRepository } from "./calendar.repository.js";
import { CalendarEventService } from "./calendar.service.js";

@Module({
  providers: [CalendarEventRepository, CalendarEventService],
  exports: [CalendarEventService, CalendarEventRepository],
})
export class CalendarModule {}
