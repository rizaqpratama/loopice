import { domainEvents, type TaskEventPayloads } from "./domainEvents";

const EVENT_NAMES = [
  "task.created",
  "task.assigned",
  "task.unassigned",
  "task.status_changed",
  "task.rescheduled",
  "task.completed",
  "task.partially_completed",
  "task.failed",
  "task.cancelled",
  "task.exception_reported",
  "task.exception_resolved",
] as const satisfies readonly (keyof TaskEventPayloads)[];

// Stub subscriber -- just logs. This is where a future notification/billing/
// routing/tracking/analytics integration would hook in.
export function registerDomainEventSubscribers(): void {
  for (const event of EVENT_NAMES) {
    domainEvents.onTyped(event, (payload) => {
      console.log(`[domainEvent] ${event}`, payload);
    });
  }
}
