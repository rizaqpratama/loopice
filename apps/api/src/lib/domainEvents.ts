import { EventEmitter } from "events";
import type { TripEventPayloads } from "./domainEvents/tripEventPayloads";
import type { RouteEventPayloads } from "./domainEvents/routeEventPayloads";

// The extension point for a future notification/billing/routing/tracking/
// analytics integration -- not an implementation of those consumers. Emit
// calls must happen after a $transaction resolves, never inside it, so a
// rolled-back write never fires an event and a slow subscriber never blocks
// the DB transaction.
export interface TaskEventPayloads {
  "task.created": { taskId: string; tenantId: string; taskNumber: string };
  "task.assigned": {
    taskId: string;
    tenantId: string;
    assignedDriverId?: string | null;
    assignedVehicleId?: string | null;
  };
  "task.unassigned": { taskId: string; tenantId: string };
  "task.status_changed": { taskId: string; tenantId: string; from: string; to: string };
  "task.rescheduled": { taskId: string; tenantId: string; reason: string };
  "task.completed": { taskId: string; tenantId: string };
  "task.partially_completed": { taskId: string; tenantId: string };
  "task.failed": { taskId: string; tenantId: string; exceptionType: string };
  "task.cancelled": { taskId: string; tenantId: string; reason: string };
  "task.exception_reported": { taskId: string; tenantId: string; exceptionId: string; type: string };
  "task.exception_resolved": { taskId: string; tenantId: string; exceptionId: string };
}

export interface DomainEventPayloads extends TaskEventPayloads, TripEventPayloads, RouteEventPayloads {}

class TypedDomainEvents extends EventEmitter {
  emitTyped<K extends keyof DomainEventPayloads>(event: K, payload: DomainEventPayloads[K]): boolean {
    return this.emit(event, payload);
  }

  onTyped<K extends keyof DomainEventPayloads>(event: K, listener: (payload: DomainEventPayloads[K]) => void): this {
    return this.on(event, listener);
  }
}

export const domainEvents = new TypedDomainEvents();
