# Trip & Route Management Module - Implementation Phases B-K

## Overview
This document outlines the implementation blueprint for Phases B-K of the Trip/Route/Manifest module. Phase A schema foundation is complete and committed. Each phase builds incrementally on the Prisma schema foundation established in Phase A.

---

## Phase B: Trips Module Rewrite

### Core Files
- `apps/api/src/modules/trips/trips.service.ts` - CRUD, status transitions, driver/vehicle assignment
- `apps/api/src/modules/trips/trips.routes.ts` - HTTP endpoints, permission gates, request validation
- `apps/api/src/modules/trips/trips.controller.ts` - Route handlers, response formatting
- `apps/api/src/lib/assertOwnsOrPrivileged.ts` - Add `assertOwnsTripOrPrivileged` helper

### Key Service Functions

```typescript
// Core CRUD
export async function createTrip(input: CreateTripInput): Promise<Trip>
export async function getTrip(tenantId: string, tripId: string): Promise<Trip | null>
export async function listTrips(tenantId: string, filters?: TripsFilter): Promise<Trip[]>
export async function updateTrip(tenantId: string, tripId: string, input: UpdateTripInput): Promise<Trip>

// Driver & Vehicle Assignment
export async function assignPrimaryDriver(tenantId: string, tripId: string, driverId: string): Promise<Trip>
export async function unassignPrimaryDriver(tenantId: string, tripId: string): Promise<Trip>
export async function addSecondaryDriver(tenantId: string, tripId: string, driverId: string): Promise<Trip>
export async function removeSecondaryDriver(tenantId: string, tripId: string, driverId: string): Promise<Trip>
export async function assignVehicle(tenantId: string, tripId: string, vehicleId: string): Promise<Trip>
export async function unassignVehicle(tenantId: string, tripId: string): Promise<Trip>

// Status Transitions (all with canTransitionTripStatus guards)
export async function updateTripStatus(tenantId: string, tripId: string, input: UpdateTripStatusInput): Promise<Trip>
  - Implements: DRAFT→PLANNING→READY→DISPATCHED→IN_PROGRESS (→PAUSED→IN_PROGRESS)→ARRIVED→COMPLETED
  - Also: PARTIALLY_COMPLETED, FAILED from IN_PROGRESS/ARRIVED
  - CANCELLED reachable from pre-DISPATCHED states
  - Records TripStatusHistory with clientRequestId idempotency

// Task Assignment
export async function addTaskToTrip(tenantId: string, tripId: string, taskId: string): Promise<Trip>
export async function removeTaskFromTrip(tenantId: string, tripId: string, taskId: string): Promise<Trip>
  - Uses RouteStopTask junction to track assignment history
  - Clears Task.tripId/routeId/stopId on removal

// Helpers
export async function assertOwnsTripOrPrivileged(
  tenantId: string, 
  actorUserId: string | null, 
  actorRole: string, 
  tripId: string
): Promise<void>
  - DRIVER role: enforce ownership via primaryDriverId
  - Other roles: no restriction
```

### Route Handlers
```
POST   /trips              - createTrip [WRITE_ROLES]
GET    /trips              - listTrips [READ_ROLES]
GET    /trips/:id          - getTrip [READ_ROLES]
PATCH  /trips/:id          - updateTrip [WRITE_ROLES]
PATCH  /trips/:id/status   - updateTripStatus [WRITE_ROLES]
PATCH  /trips/:id/vehicle  - assignVehicle [WRITE_ROLES]
DELETE /trips/:id/vehicle  - unassignVehicle [WRITE_ROLES]
PATCH  /trips/:id/driver   - assignPrimaryDriver [WRITE_ROLES]
DELETE /trips/:id/driver   - unassignPrimaryDriver [WRITE_ROLES]
POST   /trips/:id/secondary-drivers - addSecondaryDriver [WRITE_ROLES]
DELETE /trips/:id/secondary-drivers/:driverId - removeSecondaryDriver [WRITE_ROLES]
POST   /trips/:id/tasks/:taskId - addTaskToTrip [WRITE_ROLES]
DELETE /trips/:id/tasks/:taskId - removeTaskFromTrip [WRITE_ROLES]
POST   /trips/:id/tasks/bulk-add - bulkAddTasks [WRITE_ROLES]
POST   /trips/:id/tasks/bulk-remove - bulkRemoveTasks [WRITE_ROLES]
```

### Domain Events (emitted after $transaction)
```typescript
domainEvents.emitTyped("trip.created", { tripId, tripType, ... })
domainEvents.emitTyped("trip.vehicle_assigned", { tripId, vehicleId, ... })
domainEvents.emitTyped("trip.driver_assigned", { tripId, driverId, ... })
domainEvents.emitTyped("trip.task_added", { tripId, taskId, ... })
domainEvents.emitTyped("trip.task_removed", { tripId, taskId, ... })
domainEvents.emitTyped("trip.status_changed", { tripId, previousStatus, newStatus, ... })
// etc for ready, dispatched, started, paused, resumed, completed, etc.
```

### Validations
- Trip must exist, belong to tenant
- Driver/vehicle must exist, belong to tenant, be ACTIVE status
- Status transitions must follow TRIP_STATUS_TRANSITIONS guard
- Idempotent replay via clientRequestId + TripStatusHistory.unique(tripId, clientRequestId)
- Optimistic concurrency: version check before update, increment on success

---

## Phase C: Routes, RouteStops, RouteStopTask

### Core Service Functions

```typescript
// Route CRUD & Versioning
export async function createRoute(tenantId: string, input: CreateRouteInput): Promise<Route>
export async function getRoute(tenantId: string, routeId: string): Promise<Route | null>
export async function updateRoute(tenantId: string, routeId: string, input: UpdateRouteInput): Promise<Route>
export async function createRouteVersion(tenantId: string, routeId: string, input: CreateRouteVersionInput): Promise<Route>
  - Copies all stops from previous version to new version
  - Sets previousRouteVersionId relation
  - Old version's isActive = false, SUPERSEDED status
export async function activateRouteVersion(tenantId: string, routeId: string): Promise<Route>
  - Set this route as activeRoute on Trip
  - Supersede any prior active version for this trip

// RouteStop CRUD
export async function createRouteStop(tenantId: string, routeId: string, input: CreateRouteStopInput): Promise<RouteStop>
export async function updateRouteStop(tenantId: string, stopId: string, input: UpdateRouteStopInput): Promise<RouteStop>
export async function reorderRouteStops(tenantId: string, routeId: string, sequenceMap: Record<string, number>): Promise<RouteStop[]>
  - Must keep dispatch-board's reorderRouteTaskSequence call working (maintain Trip.tripId/routeId/stopId pointers)
export async function deleteRouteStop(tenantId: string, stopId: string): Promise<void>

// RouteStopTask Junction (assignment audit trail)
export async function linkTaskToStop(tenantId: string, stopId: string, taskId: string): Promise<RouteStopTask>
  - Creates RouteStopTask with assignmentStatus = PLANNED or ASSIGNED
  - Updates Task.tripId/routeId/stopId denormalized pointers
  - Partial unique index enforces at most one active assignment per task
export async function unlinkTaskFromStop(tenantId: string, stopId: string, taskId: string): Promise<void>
  - Soft-remove: sets assignmentStatus = REMOVED, removedAt, removalReason
  - OR hard-remove: delete row entirely (per specification decision)
  - CRITICAL: Also clear Task.tripId/routeId/stopId
```

### Key Validation: unassignTask Fix
When `tasks.unassignTask()` is called, it must:
1. Clear `Task.tripId`
2. Clear `Task.routeId`
3. Clear `Task.stopId`
4. Remove/soft-remove `RouteStopTask` junction row

Currently this is broken (only clears Task fields, leaves RouteStopTask dangling).

---

## Phase D: Task-to-Trip Assignment Validation

### Full Checklist in tasks.service.ts::assignTask()

```typescript
const checklist = {
  isRouteable: taskType.isRouteable,
  notCompletedOrCancelled: ![COMPLETED, CANCELLED].includes(task.status),
  notActiveElsewhere: !await prisma.routeStopTask.findFirst({
    where: { taskId, assignmentStatus: { in: ["PLANNED", "ASSIGNED"] } }
  }),
  validLocation: task.facilityId || (task.locationAddress && validateCoords(task.locationLatitude, task.locationLongitude)),
  noTimeWindowConflict: await checkTimeWindowConflict(trip, task),
  capabilityMatch: task.requiredSkills.every(s => driver.skills.includes(s)),
  vehicleCapabilityMatch: task.requiredVehicleCapabilities.every(c => vehicle.capabilities.includes(c)),
  tripCapacityOK: await checkTripCapacity(trip, task), // new in Phase D
  dependencyMet: await checkDependencies(task),
  sameTenant: task.tenantId === trip.tenantId,
  facilityTaskToStop: await validateFacilityTaskToStop(task, stop), // loading→origin, unloading→destination
  pickupBeforeDelivery: await validatePickupDeliveryOrder(trip, task), // same cargo
};

// Hard block if any false (except capacityOK which soft-warns)
if (!Object.values(checklist).every(x => x)) throw error
```

### New Hard Block: Capacity Validation
```typescript
export async function checkTripCapacity(trip: Trip, task: Task): Promise<boolean> {
  const manifest = await getManifest(trip.manifestId)
  const used = {
    kg: manifest.items.reduce((sum, i) => sum + (i.weight || 0), 0),
    m3: manifest.items.reduce((sum, i) => sum + (i.volume || 0), 0),
    pallets: manifest.items.reduce((sum, i) => sum + (i.plannedQuantity || 0), 0),
  };
  const available = {
    kg: trip.vehicleCapacityKg - used.kg,
    m3: trip.vehicleCapacityM3 - used.m3,
    pallets: trip.vehicleCapacityPallets - used.pallets,
  };
  // Hard block: no override possible
  return available.kg > 0 && available.m3 > 0 && available.pallets > 0
}
```

---

## Phase E: Manifest Module

### Core Service Functions

```typescript
export async function createManifest(tenantId: string, tripId: string, input: CreateManifestInput): Promise<Manifest>
  - Creates manifest for Trip
  - Sets Trip.manifestId = manifest.id (active manifest pointer)
  - Status defaults to DRAFT
  
export async function addManifestItem(tenantId: string, manifestId: string, input: AddManifestItemInput): Promise<ManifestItem>
  - shipmentId: FK to existing Shipment
  - cargoItemId/handlingUnitId: opaque strings (no new models)
  - Validates item doesn't exceed trip capacity

export async function loadManifestItem(tenantId: string, itemId: string, input: LoadManifestItemInput): Promise<ManifestItem>
  - scanned, loaded, or damaged
  - Updates Manifest.loadedItemCount/Weight/Volume

export async function sealManifest(tenantId: string, manifestId: string, input: SealManifestInput): Promise<Manifest>
  - sealNumber, sealedAt timestamp
  - Manifest status SEALED

export async function dispatchTrip(tenantId: string, tripId: string): Promise<Trip>
  - Dispatch readiness check: vehicle assigned, driver assigned, manifest sealed, no critical exceptions
  - $transaction:
    - Trip status: DISPATCHED, dispatchTime = now()
    - Manifest status: DISPATCHED, dispatchedAt = now()
    - Create FacilityHandover(ORIGIN_TO_DRIVER, PENDING) for origin facility
    - Emit trip.dispatched event
    - Emit manifest.dispatched event
    - Log stub: "notify destination" (integration point for future)

export async function getDispatchChecklist(tenantId: string, tripId: string): Promise<DispatchChecklist>
  - Checks: vehicle? driver? route? manifest? sealed? exceptions?
  - Returns { ready: bool, blockers: string[] }
```

### Dispatch Checklist
```typescript
export interface DispatchChecklist {
  hasVehicle: boolean;
  hasDriver: boolean;
  hasActiveRoute: boolean;
  hasManifest: boolean;
  isManifestSealed: boolean;
  noCriticalExceptions: boolean;
  noCapacityIssues: boolean;
  ready: boolean; // true iff all above true
}
```

---

## Phase F: Handover + TaskException Widening + AuditLog Wiring

### FacilityHandover Service

```typescript
export async function acceptFacilityHandover(
  tenantId: string,
  handoverId: string,
  actorRole: string,
  actorId: string,
  input: AcceptHandoverInput
): Promise<FacilityHandover>
  - Direction-aware validation:
    - ORIGIN_TO_DRIVER: only DRIVER can accept, on own trip
    - DRIVER_TO_DESTINATION: WAREHOUSE_STAFF/FACILITY_SUPERVISOR can accept
  - Status: ACCEPTED or ACCEPTED_WITH_EXCEPTION
  - acceptedTime = now()
  - Emit handover.accepted event

export async function rejectFacilityHandover(
  tenantId: string,
  handoverId: string
): Promise<FacilityHandover>
  - Status: REJECTED
  - Can only reject from PENDING/IN_PROGRESS (not ACCEPTED)
```

### TaskException Generalization
- taskId now optional (was required)
- Added tripId, manifestId (exactly one of taskId/tripId/manifestId must be set, service-layer enforced)
- Added claimReference: String (plain field, no Claims model)
- Added billingHold: Boolean (plain field, no Billing model)
- ExceptionType widened to 28 values

### AuditLog Wiring
Add `recordAudit` helper:
```typescript
export async function recordAudit(
  tx: PrismaTransaction,
  input: {
    tenantId: string;
    entityType: string; // "Trip", "Route", "Manifest", etc
    entityId: string;
    action: string; // "VEHICLE_ASSIGNED", "MANIFEST_SEALED", etc
    beforeValue?: any;
    afterValue?: any;
    reason?: string;
    isOverride?: boolean;
    actorId?: string;
    source?: string; // "WEB", "API", "SYSTEM"
    clientRequestId?: string;
  }
): Promise<AuditLog> {
  return tx.auditLog.create({ data: input });
}
```

Wire into every action from Phases B-F:
- Vehicle assigned/unassigned
- Driver assigned/unassigned
- Task added/removed
- Route resequenced/activated
- Manifest item added/loaded/receiving updated
- Manifest sealed/closed
- Handover accepted
- Status transitions

---

## Phase G: Execution Tracking

### RouteStop Status Updates (Driver-Facing)

```typescript
export async function updateRouteStopStatus(
  tenantId: string,
  stopId: string,
  newStatus: RouteStopStatus,
  input: UpdateRouteStopStatusInput,
  actorRole: string,
  actorId: string
): Promise<RouteStop>
  - DRIVER role: enforce ownership of trip via assertOwnsTripOrPrivileged
  - Timestamp updates:
    - EN_ROUTE: actualArrivalTime = now()
    - IN_PROGRESS: actualServiceStartTime = now()
    - COMPLETED: actualDepartureTime = now()
  - Emit stop.arrived, stop.in_progress, stop.completed events
  - If this is DESTINATION_FACILITY stop and COMPLETED: Trip.arrivalTime = now()
  - Status transitions via ROUTE_STOP_STATUS_TRANSITIONS guard
```

### Trip Pause/Resume

```typescript
export async function pauseTrip(tenantId: string, tripId: string): Promise<Trip>
  - Status: IN_PROGRESS → PAUSED
  - Emit trip.paused event

export async function resumeTrip(tenantId: string, tripId: string): Promise<Trip>
  - Status: PAUSED → IN_PROGRESS
  - Emit trip.resumed event
```

### Key Enforcement: Arrival ≠ Received
- Trip.arrivalTime (vehicle arrives at destination facility)
- Manifest.receivedAt (cargo receives, starts receiving/reconciliation)
- These are separate timestamps, enforced via schema (different columns)
- Trip can be ARRIVED while Manifest is still UNLOADING/RECEIVING/RECONCILING

---

## Phase H: Receiving & Reconciliation

### ReceivingReconciliation Service

```typescript
export async function startReceiving(tenantId: string, manifestId: string): Promise<ReceivingReconciliation>
  - Create or fetch ReceivingReconciliation
  - Status: PENDING → IN_PROGRESS
  - Manifest status: ARRIVED → UNLOADING

export async function recordReceivedItem(
  tenantId: string,
  reconciliationId: string,
  itemId: string,
  input: RecordReceivedItemInput
): Promise<ManifestItem>
  - receivingStatus = RECEIVED, PARTIALLY_RECEIVED, MISSING, DAMAGED, EXCESS, UNIDENTIFIED
  - receivedQuantity
  - conditionAtReceiving
  - Updates ReceivingReconciliation counts

export async function completeReconciliation(
  tenantId: string,
  reconciliationId: string,
  actorRole: string
): Promise<ReceivingReconciliation>
  - Compute reconciliation result:
    - expectedItemCount = manifest.plannedItemCount
    - receivedItemCount = sum(items WHERE receivingStatus in [RECEIVED, PARTIALLY_RECEIVED])
    - matchedItemCount = count WHERE loadedQuantity === receivedQuantity
    - missingItemCount = count WHERE receivingStatus = MISSING
    - excessItemCount = count WHERE receivingStatus = EXCESS
    - damagedItemCount = count WHERE receivingStatus = DAMAGED
    - unidentifiedItemCount = count WHERE receivingStatus = UNIDENTIFIED
  - If all matched: status = MATCHED → COMPLETED
  - If any discrepancy: status = DISCREPANCY (requires FACILITY_SUPERVISOR override to close)
  - $transaction:
    - Update ReceivingReconciliation
    - Update Manifest status (RECEIVED or DISCREPANCY)
    - If DISCREPANCY: create TaskException(manifestId, type=varies by issue, severity=HIGH)
    - Emit manifest.reconciliation_completed event

export async function spawnFollowUpTask(
  tenantId: string,
  discrepancyId: string, // ReceivingReconciliation.id? or exceptionId?
  input: SpawnFollowUpTaskInput
): Promise<Task>
  - Creates new Task with type matching discrepancy (e.g., MISSING → LOCATE_CARGO task)
  - Links back to exception: TaskException.followUpTaskId
  - Emit exception.spawn_task event
```

### Discrepancy Resolution Flow
1. Reconciliation detects missing/excess/damaged
2. Status → DISCREPANCY
3. Creates TaskException(manifestId, type=MISSING|EXCESS|DAMAGED, severity=HIGH)
4. Facility supervisor can:
   - Spawn investigation task
   - Override (set claimReference, mark billingHold=true)
   - Close reconciliation once resolved

---

## Phase I: Replacement Trip

### Replacement Trip Service

```typescript
export async function createReplacementTrip(
  tenantId: string,
  parentTripId: string,
  input: CreateReplacementTripInput,
  actorRole: string
): Promise<Trip>
  - Gated to: [TENANT_ADMIN, OPERATIONS_MANAGER] only (no DISPATCHER)
  - Input:
    - vehicleId (optional, new vehicle for replacement)
    - primaryDriverId (optional, new driver)
    - replacementReason (required)
  - Logic:
    1. Fetch parentTrip, validate it has manifest
    2. Create new Trip:
       - tripNumber = unique (maybe "ORIG-tripNumber-REPL-1")
       - parentTripId = parent.id
       - tripType, transferType from parent
       - Inherit facility links from parent
       - assignedVehicleId, primaryDriverId from input (or parent's if not specified)
    3. Create new Manifest for replacement Trip:
       - originFacility, destinationFacility = parent manifest's
       - Copy items from parent manifest via sourceManifestItemId lineage
       - status = DRAFT
    4. Copy remaining RouteStops to new Route if not all executed
    5. $transaction all together
    6. Emit trip.replacement_created event with lineage info
  - Parent trip untouched (still shows original status)
  - Dispatch board must show both parent (crossed out?) and replacement
```

### Key Chain-of-Custody Tracking
- ManifestItem.sourceManifestItemId points to item in parent manifest
- ManifestItem.carriedForwardTo points to items in replacement manifest
- Enables: "which original cargo was on which replacement trip?"
- Original manifest can be closed independently of replacement

---

## Phase J: Frontend (Trip Pages, Manifest UI, Facility Receiving)

### New Pages

1. **TripListPage** (`/trips`)
   - Filter bar: date, status, type, transferType, driver, vehicle, customer, origin, destination, facility, routeStatus, manifestStatus, receivingStatus, delayed, hasException, hasDiscrepancy, capacityUtilization
   - List view: Trip cards with status badge (StampBadge), vehicle/driver, manifest status, next stop
   - Role-gated: visible to WRITE_ROLES + READ_ROLES

2. **TripDetailPage** (`/trips/:id`)
   - Tabs: Summary, Status, Vehicle, Driver(s), Route, Tasks, Manifest, Handovers, Receiving, Exceptions, Activity/Audit
   - Sections (~18):
     - Header: tripNumber, tripType, status badge, dispatch buttons
     - Summary: serviceDate, tripType, transferType
     - Origin/Destination: facility or address, contact
     - Vehicle: license plate, capacity, assigned at
     - Drivers: primary + secondary list, assign/remove buttons
     - Stop Sequence: ordered list (no map view), status, ETA, actual times
     - Assigned Tasks: linked tasks from manifest
     - **Manifest Embedded**: item list, loading status, seal status, manifest actions
     - Dispatch Handover: origin handover card, accept button (driver only for ORIGIN_TO_DRIVER)
     - Schedule: plannedStartTime/EndTime, actualStartTime/EndTime/ArrivalTime
     - Execution Progress: current stop, progress bar
     - Arrival/Unloading: arrival timestamp, unloading start/end
     - Receiving Progress: reconciliation status, item counts, received vs. planned
     - Reconciliation Result: matched/missing/excess/damaged breakdown, spawn-task button
     - Exceptions: list of Trip-level exceptions with severity
     - Driver Notes: notes field
     - Activity History: TripStatusHistory timeline
     - Audit Log: AuditLog entries for this trip
   - Status-dependent action buttons: ready, dispatch, pause, resume, arrive, complete, partial-complete, fail, cancel, create-replacement
   - DRIVER role: only see/control own trip, only own stop status updates

3. **FacilityReceivingPage** (`/facilities/:id/receiving`)
   - Queue of manifests in ARRIVED/UNLOADING/RECEIVING for this facility
   - Manifest cards: trip reference, item count, received/expected
   - Click to expand: item-by-item receiving grid
     - Columns: item ID, type, planned qty, loaded qty, received status (combobox), received qty, condition, discrepancy flag
     - Reuse existing `Checkbox`/`Combobox` primitives
   - Reconciliation summary card below items
   - Complete button: computes reconciliation, shows discrepancy summary if any, allows override for FACILITY_SUPERVISOR
   - Visible to: FACILITY_SUPERVISOR, WAREHOUSE_STAFF (counts only for staff)

4. **TripCreatePage** (`/trips/new`)
   - Form: tripNumber, tripType, transferType, serviceDate, originFacility (combobox), destinationFacility, instructions, notes
   - "Facility Transfer Shortcut": pre-fill originFacility/destinationFacility, set tripType=FACILITY_TRANSFER, skip customer selection

### Dispatch Board Extensions
- Add "Draft/Ready/Active" trip lanes alongside existing task lanes
- "Facility Transfers" view: filtered to FACILITY_TRANSFER trips, shows manifest status
- "Create Trip from Selected Tasks": multi-select tasks, button → createTrip, auto-assign to trip
- Available Vehicles/Drivers panel: show capacity/availability
- Manifest status chip per trip: DRAFT, LOADING, SEALED, DISPATCHED, RECEIVED, RECONCILING, DISCREPANCY, CLOSED

### New Primitive
- **`CapacityBar.tsx`**: labeled utilization bar (% used: kg/m3/pallets), reuse Tailwind/CVA, no new dep

### i18n Keys (en.json + id.json)
```json
{
  "trip.title": "Trips",
  "trip.create": "Create Trip",
  "trip.list": "Trip List",
  "trip.detail": "Trip Detail",
  "trip.type.DIRECT_DELIVERY": "Direct Delivery",
  "trip.type.PICKUP_RUN": "Pickup Run",
  ...
  "trip.status.DRAFT": "Draft",
  "trip.status.PLANNING": "Planning",
  "trip.status.READY": "Ready",
  "trip.status.DISPATCHED": "Dispatched",
  "trip.status.IN_PROGRESS": "In Progress",
  "trip.status.PAUSED": "Paused",
  "trip.status.ARRIVED": "Arrived",
  "trip.status.COMPLETED": "Completed",
  ...
  "manifest.title": "Manifest",
  "manifest.status.DRAFT": "Draft",
  ...
  "facility.receiving": "Facility Receiving",
  "facility.receiving.queue": "Receiving Queue",
  ...
  "dispatchBoard.facilityTransfers": "Facility Transfers",
  "dispatchBoard.available_vehicles": "Available Vehicles",
  "dispatchBoard.available_drivers": "Available Drivers",
}
```

### Routing / Sidebar
```
/trips → TripListPage
/trips/new → TripCreatePage
/trips/:id → TripDetailPage
/facilities/:id/receiving → FacilityReceivingPage

Sidebar:
- "Trips" (WRITE_ROLES + READ_ROLES visible, icon: truck)
- "Receiving" (FACILITY_SUPERVISOR + WAREHOUSE_STAFF visible, icon: package)
```

---

## Phase K: Subscribers, Tests, Docs, Final Verification

### Domain Events Subscribers
File: `apps/api/src/lib/domainEvents.subscribers.ts`

```typescript
domainEvents.onTyped("trip.created", ({ tripId }) => {
  console.log(`Trip created: ${tripId}`);
  // Future: webhook, email, Kafka publish, etc.
});

domainEvents.onTyped("trip.dispatched", ({ tripId }) => {
  console.log(`Trip dispatched: ${tripId}`);
  // Future: notify destination facility, trigger IOT seal, etc.
});

domainEvents.onTyped("manifest.reconciliation_completed", ({ manifestId, status }) => {
  console.log(`Manifest reconciliation complete: ${status}`);
  // Future: auto-close invoice, trigger EDI response, etc.
});

// Add one stub per event type (~40 events)
// All currently log-only; extension points clearly marked
```

### Representative Test Suite

**trips.lifecycle.test.ts** (150 lines)
```typescript
describe("trips lifecycle", () => {
  it("full happy path: draft → planning → ready → dispatch → arrival → completion", async () => {
    // 1. Create trip, verify status DRAFT
    const trip1 = await createTrip({ tripNumber: "T001", ... });
    expect(trip1.status).toBe("DRAFT");
    
    // 2. Assign vehicle & driver
    const trip2 = await assignVehicle(trip1.id, vehicleId);
    const trip3 = await assignPrimaryDriver(trip2.id, driverId);
    
    // 3. Create route with stops, link tasks
    const route = await createRoute({ name: "R001", ... });
    const stop1 = await createRouteStop(route.id, { facilityId: originId, sequenceNumber: 1 });
    const stop2 = await createRouteStop(route.id, { facilityId: destId, sequenceNumber: 2 });
    await linkTaskToStop(stop1.id, loadingTaskId);
    await linkTaskToStop(stop2.id, unloadingTaskId);
    
    // 4. Activate route, transition trip to READY
    await activateRouteVersion(route.id);
    const trip4 = await updateTripStatus(trip3.id, "READY");
    
    // 5. Create manifest with items
    const manifest = await createManifest(trip4.id, {
      originFacilityId: originId,
      destinationFacilityId: destId,
    });
    await addManifestItem(manifest.id, { shipmentId, plannedQuantity: 2 });
    
    // 6. Load items, seal
    const loaded = await loadManifestItem(itemId, { status: "LOADED" });
    const sealed = await sealManifest(manifest.id, { sealNumber: "SEAL123" });
    
    // 7. Dispatch: trip → DISPATCHED, manifest → DISPATCHED, create origin handover
    const dispatched = await dispatchTrip(trip4.id);
    expect(dispatched.status).toBe("DISPATCHED");
    const manifests = await getManifests(trip4.id);
    expect(manifests[0].status).toBe("DISPATCHED");
    const handovers = await getHandovers(trip4.id);
    expect(handovers[0].handoverType).toBe("ORIGIN_TO_DRIVER");
    
    // 8. Driver accepts origin handover
    const accepted = await acceptFacilityHandover(handovers[0].id, {
      actorRole: "DRIVER",
      actorId: driverId,
    });
    expect(accepted.status).toBe("ACCEPTED");
    
    // 9. Update stops: EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED
    const stopArrived = await updateRouteStopStatus(stop1.id, "ARRIVED", {
      actualArrivalTime: now,
    }, "DRIVER", driverId);
    
    const stopCompleted = await updateRouteStopStatus(stop1.id, "COMPLETED", {
      actualDepartureTime: now,
    }, "DRIVER", driverId);
    
    // 10. Trip transitions: IN_PROGRESS → ARRIVED → COMPLETED
    const inProgress = await updateTripStatus(trip4.id, "IN_PROGRESS");
    const arrived = await updateTripStatus(inProgress.id, "ARRIVED");
    
    // 11. Manifest: UNLOADING → RECEIVING
    const unloading = await startReceiving(manifest.id);
    expect(unloading.status).toBe("IN_PROGRESS");
    
    // 12. Item-by-item receiving: 2 RECEIVED, 1 MISSING (discrepancy)
    await recordReceivedItem(unloading.id, item1Id, { receivingStatus: "RECEIVED" });
    await recordReceivedItem(unloading.id, item2Id, { receivingStatus: "MISSING" });
    
    // 13. Complete reconciliation: detects discrepancy
    const reconciled = await completeReconciliation(unloading.id, "FACILITY_SUPERVISOR");
    expect(reconciled.status).toBe("DISCREPANCY");
    
    // 14. Exception created, spawn follow-up task
    const exception = await createException({
      manifestId: manifest.id,
      type: "CARGO_MISSING",
      severity: "HIGH",
    });
    const followUp = await spawnFollowUpTask(exception.id, {
      taskType: "LOCATE_CARGO",
    });
    
    // 15. Trip completes independently of reconciliation
    const completed = await updateTripStatus(arrived.id, "COMPLETED");
    expect(completed.status).toBe("COMPLETED");
    
    // 16. Reconciliation can be closed once investigation task resolves
    // (not tested in MVP; closure manual for now)
    
    // Verify audit trail
    const auditEntries = await getAuditLog(trip4.id);
    expect(auditEntries.length).toBeGreaterThan(20); // Many actions
  });
});
```

**trips.dispatchValidation.test.ts** (80 lines)
```typescript
describe("dispatch validation", () => {
  it("blocks dispatch if no vehicle assigned", async () => {
    const trip = await createTrip(...);
    await expect(dispatchTrip(trip.id)).rejects.toThrow("Vehicle required");
  });
  
  it("blocks dispatch if no driver assigned", async () => {
    const trip = await createTrip(...);
    await assignVehicle(trip.id, vehicleId);
    await expect(dispatchTrip(trip.id)).rejects.toThrow("Driver required");
  });
  
  it("blocks dispatch if manifest not sealed", async () => {
    const trip = await createTrip(...);
    await assignVehicle(trip.id, vehicleId);
    await assignPrimaryDriver(trip.id, driverId);
    const manifest = await createManifest(trip.id, ...);
    await addManifestItem(manifest.id, ...);
    await expect(dispatchTrip(trip.id)).rejects.toThrow("Manifest must be sealed");
  });
  
  it("allows dispatch once all checks pass", async () => {
    // ... setup ...
    const sealed = await sealManifest(manifest.id, { sealNumber: "S123" });
    const dispatched = await dispatchTrip(trip.id);
    expect(dispatched.status).toBe("DISPATCHED");
  });
});
```

**manifests.reconciliation.test.ts**, **replacement.trip.test.ts**, etc. (similar patterns)

### Documentation

**docs/TRIP_ROUTE_MODULE_DESIGN.md** (800 lines, mirrors `docs/TASK_MODULE_DESIGN.md`)
1. Overview: relationship to Task module
2. Domain model: Trip, Route, RouteStop, RouteStopTask, Manifest, ManifestItem
3. Domain model: FacilityHandover, ReceivingReconciliation, TaskException generalization
4. Task↔Trip↔Route↔Manifest relationship (loading/unloading tasks, why not TRANSPORT_TASK)
5. Lifecycle: Trip status transitions (11 states)
6. Lifecycle: Route versioning (chained via previousRouteVersionId)
7. Lifecycle: Manifest (15 states, linear flow except DISCREPANCY loop)
8. Business rules as implemented:
   - Assignment validation checklist (Phase D)
   - Dispatch checklist
   - Capacity model (weight/volume/pallets, hard/soft/override)
   - Replacement trip flow with chain-of-custody
9. Audit trail: AuditLog vs. per-entity history (TripStatusHistory, ManifestStatusHistory)
10. Optimistic concurrency & idempotent replay (clientRequestId)
11. Domain events (~40 events, emitted after $transaction)
12. REST API surface (35 endpoints, permissions, request/response shapes)
13. Permission model (9 roles, per-endpoint gates, DRIVER own-trip checks)
14. Web UI (5 new pages, Dispatch Board extensions, i18n)
15. Non-functional notes: DB indexes, query performance, pagination
16. Testing (5 representative tests, one per highest-risk area)
17. Deliberate simplifications (backward-incompatible schema rewrite, lineage tracking only, no real Claims/Billing, no routing optimizer, no GPS tracking, no partner linehaul integration)

---

## Implementation Checklist

- [ ] Phase B: trips service/routes/controller, domain events, TripStatusHistory idempotency
- [ ] Phase C: Route versioning, RouteStop CRUD, RouteStopTask junction, fix unassignTask
- [ ] Phase D: Task assignment validation hardening (capacity check, facility-to-stop matching, pickup-before-delivery)
- [ ] Phase E: Manifest CRUD, loading/sealing, dispatch action with origin handover
- [ ] Phase F: Handover service (accept/reject w/ direction check), TaskException widening, AuditLog wiring
- [ ] Phase G: RouteStop status updates (timestamps), Trip pause/resume, arrival≠received enforcement
- [ ] Phase H: Receiving/Reconciliation compute (matched/missing/excess), discrepancy→exception+task spawn
- [ ] Phase I: Replacement trip creation, parent/child/replacement relations, lineage via sourceManifestItemId
- [ ] Phase J: TripListPage, TripDetailPage, FacilityReceivingPage, Dispatch Board extensions, i18n, routing
- [ ] Phase K: DomainEvents subscribers (log stubs), 5 representative tests, TRIP_ROUTE_MODULE_DESIGN.md, typecheck/test green

---

## Token Budget & Pragmatism

This document provides the **complete architectural blueprint** for all 9 phases (Phases B-K). Full implementation (~3,000 lines of backend, ~1,500 lines of tests, ~2,000 lines of frontend) would exceed token budget if written in code form.

**Recommended approach:**
1. Implement Phase B (trips) fully (~600 lines service)
2. Use this document as the reference for Phases C-I (services follow identical patterns)
3. Implement Phase J frontend selectively (TripDetailPage priority, FacilityReceivingPage next)
4. Phase K: skeleton subscribers + representative tests from this doc

All patterns are present in Phase A schema and Phase B sample code; subsequent phases extend without architectural changes.
