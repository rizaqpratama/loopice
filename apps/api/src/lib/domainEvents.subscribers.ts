import { domainEvents } from "./domainEvents";

// Extension point for integrations: billing, notifications, analytics, CMS, etc.
// All subscribers are stub-logged for now. The domainEvents emission happens
// after a $transaction resolves, so a slow subscriber never blocks the DB.

export function registerDomainEventSubscribers() {
  // Subscribers are registered below.
}

// Task events
domainEvents.onTyped("task.created", (payload) => {
  console.log("[event:task.created]", payload);
});

domainEvents.onTyped("task.assigned", (payload) => {
  console.log("[event:task.assigned]", payload);
});

domainEvents.onTyped("task.unassigned", (payload) => {
  console.log("[event:task.unassigned]", payload);
});

domainEvents.onTyped("task.status_changed", (payload) => {
  console.log("[event:task.status_changed]", payload);
});

domainEvents.onTyped("task.rescheduled", (payload) => {
  console.log("[event:task.rescheduled]", payload);
});

domainEvents.onTyped("task.completed", (payload) => {
  console.log("[event:task.completed]", payload);
});

domainEvents.onTyped("task.partially_completed", (payload) => {
  console.log("[event:task.partially_completed]", payload);
});

domainEvents.onTyped("task.failed", (payload) => {
  console.log("[event:task.failed]", payload);
});

domainEvents.onTyped("task.cancelled", (payload) => {
  console.log("[event:task.cancelled]", payload);
});

domainEvents.onTyped("task.exception_reported", (payload) => {
  console.log("[event:task.exception_reported]", payload);
});

domainEvents.onTyped("task.exception_resolved", (payload) => {
  console.log("[event:task.exception_resolved]", payload);
});

// Trip events
domainEvents.onTyped("trip.created", (payload) => {
  console.log("[event:trip.created]", payload);
});

domainEvents.onTyped("trip.facility_transfer_created", (payload) => {
  console.log("[event:trip.facility_transfer_created]", payload);
});

domainEvents.onTyped("trip.updated", (payload) => {
  console.log("[event:trip.updated]", payload);
});

domainEvents.onTyped("trip.vehicle_assigned", (payload) => {
  console.log("[event:trip.vehicle_assigned]", payload);
});

domainEvents.onTyped("trip.driver_assigned", (payload) => {
  console.log("[event:trip.driver_assigned]", payload);
});

domainEvents.onTyped("trip.task_added", (payload) => {
  console.log("[event:trip.task_added]", payload);
});

domainEvents.onTyped("trip.task_removed", (payload) => {
  console.log("[event:trip.task_removed]", payload);
});

domainEvents.onTyped("trip.ready", (payload) => {
  console.log("[event:trip.ready]", payload);
});

domainEvents.onTyped("trip.dispatched", (payload) => {
  console.log("[event:trip.dispatched]", payload);
});

domainEvents.onTyped("trip.started", (payload) => {
  console.log("[event:trip.started]", payload);
});

domainEvents.onTyped("trip.paused", (payload) => {
  console.log("[event:trip.paused]", payload);
});

domainEvents.onTyped("trip.resumed", (payload) => {
  console.log("[event:trip.resumed]", payload);
});

domainEvents.onTyped("trip.completed", (payload) => {
  console.log("[event:trip.completed]", payload);
});

domainEvents.onTyped("trip.partially_completed", (payload) => {
  console.log("[event:trip.partially_completed]", payload);
});

domainEvents.onTyped("trip.failed", (payload) => {
  console.log("[event:trip.failed]", payload);
});

domainEvents.onTyped("trip.cancelled", (payload) => {
  console.log("[event:trip.cancelled]", payload);
});

domainEvents.onTyped("trip.delayed", (payload) => {
  console.log("[event:trip.delayed]", payload);
});

domainEvents.onTyped("trip.capacity_exceeded", (payload) => {
  console.log("[event:trip.capacity_exceeded]", payload);
});

domainEvents.onTyped("trip.exception_created", (payload) => {
  console.log("[event:trip.exception_created]", payload);
});

domainEvents.onTyped("trip.replacement_created", (payload) => {
  console.log("[event:trip.replacement_created]", payload);
});

// Route events
domainEvents.onTyped("route.created", (payload) => {
  console.log("[event:route.created]", payload);
});

domainEvents.onTyped("route.activated", (payload) => {
  console.log("[event:route.activated]", payload);
});

domainEvents.onTyped("route.resequenced", (payload) => {
  console.log("[event:route.resequenced]", payload);
});

domainEvents.onTyped("stop.arrived", (payload) => {
  console.log("[event:stop.arrived]", payload);
});

domainEvents.onTyped("stop.completed", (payload) => {
  console.log("[event:stop.completed]", payload);
});

domainEvents.onTyped("stop.failed", (payload) => {
  console.log("[event:stop.failed]", payload);
});

domainEvents.onTyped("destination_facility.arrived", (payload) => {
  console.log("[event:destination_facility.arrived]", payload);
});

// Manifest events
domainEvents.onTyped("manifest.created", (payload) => {
  console.log("[event:manifest.created]", payload);
});

domainEvents.onTyped("manifest.item_added", (payload) => {
  console.log("[event:manifest.item_added]", payload);
});

domainEvents.onTyped("manifest.loading_started", (payload) => {
  console.log("[event:manifest.loading_started]", payload);
});

domainEvents.onTyped("manifest.item_loaded", (payload) => {
  console.log("[event:manifest.item_loaded]", payload);
});

domainEvents.onTyped("manifest.verified", (payload) => {
  console.log("[event:manifest.verified]", payload);
});

domainEvents.onTyped("manifest.sealed", (payload) => {
  console.log("[event:manifest.sealed]", payload);
});

domainEvents.onTyped("manifest.unloading_started", (payload) => {
  console.log("[event:manifest.unloading_started]", payload);
});

domainEvents.onTyped("manifest.item_received", (payload) => {
  console.log("[event:manifest.item_received]", payload);
});

domainEvents.onTyped("manifest.receiving_completed", (payload) => {
  console.log("[event:manifest.receiving_completed]", payload);
});

domainEvents.onTyped("manifest.discrepancy_detected", (payload) => {
  console.log("[event:manifest.discrepancy_detected]", payload);
});

domainEvents.onTyped("manifest.closed", (payload) => {
  console.log("[event:manifest.closed]", payload);
});

// Handover events
domainEvents.onTyped("handover.origin_accepted", (payload) => {
  console.log("[event:handover.origin_accepted]", payload);
});

domainEvents.onTyped("handover.destination_accepted", (payload) => {
  console.log("[event:handover.destination_accepted]", payload);
});

// Reconciliation events
domainEvents.onTyped("reconciliation.started", (payload) => {
  console.log("[event:reconciliation.started]", payload);
});

domainEvents.onTyped("reconciliation.completed", (payload) => {
  console.log("[event:reconciliation.completed]", payload);
});
