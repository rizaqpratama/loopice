# Trip & Route Management Module Design

## 1. Overview

The Trip & Route Management Module extends Loopice's operational execution layer to model inter-facility transport as a first-class operation: real-world journeys with manifests, facility handovers, capacity constraints, and receiving-workflow reconciliation.

The module builds atop the existing Task Management Module (which handles individual pickup/delivery tasks) and the Fleet/Driver/Vehicle/Station infrastructure already in place. A Trip orchestrates multiple Tasks, a Route describes the sequence of stops the Trip will execute, and a Manifest captures the cargo handover chain-of-custody. When a Trip fails mid-route, a Replacement Trip carries forward remaining work and maintains lineage.

**Relationship to Task Module**: Tasks are *what* (pickup this parcel), Trips are *how* (the vehicle, route, and schedule executing those tasks). A single trip may include multiple loading tasks (at origin) and unloading tasks (at destination and intermediate stops). The Trip and Route are planning/dispatch constructs; the Task status transitions track real-time execution.

---

## 2. Domain Model: Trip

A Trip models a complete operational journey:

- **Trip Number**: unique per tenant (immutable once assigned).
- **Trip Type**: `DIRECT_DELIVERY`, `PICKUP_RUN`, `DELIVERY_RUN`, `MILK_RUN`, `LINEHAUL`, `INTER_FACILITY`, `WAREHOUSE_TRANSFER`, `FACILITY_TRANSFER`, etc. — determines assignment rules and default workflows.
- **Transfer Type**: for facility transfers only; `WAREHOUSE_TRANSFER`, `BRANCH_TRANSFER`, `CROSS_DOCK_TRANSFER`, `STOCK_REBALANCING`, etc.
- **Status**: `DRAFT` → `PLANNING` → `READY` → `DISPATCHED` → `IN_PROGRESS` → `{ARRIVED, PAUSED, ...}` → `{COMPLETED, PARTIALLY_COMPLETED, FAILED, CANCELLED}`. (See section 7 for full state machine.)
- **Timing**: `plannedStartTime`, `plannedEndTime`, `actualStartTime`, `actualEndTime`, `dispatchTime`, `arrivalTime`, `returnTime`.
- **Assignments**: primary driver, secondary drivers, vehicle, active route, active manifest.
- **Facilities**: `originFacility` (Station FK), `destinationFacility` (Station FK), plus opaque string fields for non-facility waypoints.
- **Capacity Denormalization**: `vehicleCapacity*` (kg/m³/pallets, snapshot from vehicle) and `plannedLoad*` / `actualLoad*` (snapshot from active manifest), kept in sync for fast queries without join.
- **Chain of Custody**: `parentTripId` for a replacement's parent; `replacementTripId` + `replacementReason` when a new Trip is spawned.
- **Versioning & Idempotency**: `version` (int) for optimistic concurrency; `TripStatusHistory` with `clientRequestId` unique constraint for replay detection.

---

## 3. Domain Model: Route, RouteStop, RouteStopTask

### Route

A Route is an ordered, versioned blueprint of stops:

- **Route Number** (immutable), **Name**, **Code** (optional), **Description**.
- **Trip Ownership**: a Trip owns *multiple* Route rows (versions); exactly one is active (`activeRouteId` denormalization).
- **Versioning**: new version = new row, with `previousRouteVersionId` linking to prior version. Activating a new version sets the old's `status=SUPERSEDED`.
- **Status**: `DRAFT` → `PLANNED` → `ACTIVE` → `{COMPLETED, SUPERSEDED, CANCELLED}`.
- **Source**: `MANUAL`, `SYSTEM_SUGGESTED`, `OPTIMIZED`, `IMPORTED`, `RECALCULATED` (for future optimizer).
- **Planning**: `totalStops`, `totalDistance`, `estimatedDuration`, `optimizationMethod`, `optimizationScore` (placeholders for future algos).
- **Geometry**: `polyline` (optional; no client-side map view in MVP, so unused for now).

### RouteStop

A Stop within a Route:

- **Sequence Number** (unique per route).
- **Stop Type**: `DEPOT_START`, `PICKUP`, `DELIVERY`, `PICKUP_AND_DELIVERY`, `ORIGIN_FACILITY`, `DESTINATION_FACILITY`, `INTERMEDIATE_FACILITY`, `BREAK`, `FUEL`, etc.
- **Status**: `PLANNED` → `EN_ROUTE` → `ARRIVED` → `IN_PROGRESS` → `{COMPLETED, SKIPPED, FAILED}`.
- **Location**: real Station FK for facilities; flat snapshot fields (`address`, `latitude`, `longitude`, `contactName`, `contactPhone`) for customer/partner locations.
- **Timing**: `plannedArrivalTime`, `plannedDepartureTime`, `timeWindowStart`, `timeWindowEnd`, actual times (recorded by driver on arrival/departure).
- **Instructions**: access notes, service notes, links to Tasks assigned to this stop.

### RouteStopTask

Historized junction: the source of truth for which Tasks are assigned to which RouteStops, and their assignment lifecycle:

- **Junction**: `routeStopId` + `taskId` (FK to RouteStop and Task).
- **Assignment Status**: `PLANNED` → `ASSIGNED` → `REMOVED` (or directly `ASSIGNED`). Also `COMPLETED`, `FAILED` if task status reaches those.
- **Audit Trail**: `assignedAt`, `removedAt`, `removalReason` for why a Task was unassigned mid-trip.
- **Database Constraint**: a partial unique index on `(taskId)` WHERE `assignmentStatus IN ('PLANNED', 'ASSIGNED')` enforces "at most one active assignment per task" at the DB level.

**Denormalization**: Task rows still carry `tripId`, `routeId`, `stopId` for fast filtering (dispatch board queries). These mirror whichever RouteStopTask row is currently active. Keeping both is a conscious trade-off: rebuilding that plumbing for true normalization isn't justified given the read-side query patterns already in place.

---

## 4. Domain Model: Manifest & ManifestItem

### Manifest

Manifest captures the cargo being transported on a Trip:

- **Manifest Number** (unique per tenant).
- **Trip**: one Trip may have multiple Manifests over time (e.g., if a Trip is partially completed and a follow-up/replacement manifest is created). At the application layer, exactly one is *active* per Trip at a time (denormalized via `Trip.manifestId`).
- **Origin/Destination Facility**: real FK to the Station model.
- **Status**: `DRAFT` → `PLANNED` → `LOADING` → `LOADED` → `SEALED` → `DISPATCHED` → `IN_TRANSIT` → `ARRIVED` → `UNLOADING` → `RECEIVING` → `RECONCILING` → `{MATCHED, DISCREPANCY}` → `CLOSED`. (Cancellable at pre-`DISPATCHED` stages.)
- **Counts**: `plannedItemCount`, `loadedItemCount`, `receivedItemCount` (and matching weight/volume variants).
- **Sealing**: `sealNumber`, `sealedAt`; requires `FACILITY_SUPERVISOR` to override a discrepancy-block.
- **Dispatch**: `dispatchedAt` (when manifest leaves origin); `receivedAt` (when it arrives at destination).
- **Closure**: `closedAt` (independent of Trip status; a manifest may be reconciled and closed while the Trip is still in progress).
- **Versioning**: `version` (int) for optimistic concurrency.

### ManifestItem

Individual cargo units:

- **Cargo Linkage**: `shipmentId` (real FK to existing Shipment model); `cargoItemId`, `handlingUnitId` (opaque strings — no new Cargo/HandlingUnit models, following TaskShipment precedent).
- **Lineage** (for replacements): `sourceManifestItemId` (FK to the item it replaced on a prior manifest); `carriedForwardTo` (inverse, for querying descendants).
- **Type**: `SHIPMENT`, `PARCEL`, `CARTON`, `PALLET`, `CONTAINER`, `DOCUMENT`, etc.
- **Identifier**: barcode or SKU; may be scanned at load/receive checkpoints.
- **Quantities**: `plannedQuantity`, `loadedQuantity`, `receivedQuantity`.
- **Weight/Volume** (denormalized from Shipment, or manual entry).
- **Condition**: `conditionAtLoading`, `conditionAtReceiving` (free text; e.g., "undamaged", "crushed corner").
- **Status Pair**: 
  - Loading-side: `loadingStatus` (`PLANNED` → `SCANNED` → `LOADED` | `MISSING`/`REMOVED`/`DAMAGED`).
  - Receiving-side: `receivingStatus` (`PENDING` → `RECEIVED` | `PARTIALLY_RECEIVED`/`MISSING`/`DAMAGED`/`EXCESS`/`UNIDENTIFIED`).
- **Discrepancy**: if receiving count ≠ planned count, `discrepancyType` (enum: `MISSING`, `EXCESS`, `DAMAGED`, `PARTIAL_QUANTITY`, etc.) and `discrepancyQuantity`.

---

## 5. Domain Model: FacilityHandover & ReceivingReconciliation

### FacilityHandover

A custody transfer event:

- **Handover Type**: `ORIGIN_TO_DRIVER` (origin facility → driver taking custody), `DRIVER_TO_DESTINATION` (driver → destination facility), `FACILITY_TO_PARTNER`, `PARTNER_TO_FACILITY`.
- **Status**: `PENDING` → `IN_PROGRESS` → `{ACCEPTED, ACCEPTED_WITH_EXCEPTION, REJECTED}` → (terminal).
- **Actors**: polymorphic (`HandoverActorType` enum: `FACILITY`, `DRIVER`, `PARTNER`, `SYSTEM`). Deliberately not FK-constrained; the actor ID is opaque per type.
- **Seal**: `sealNumber`, `sealCondition` (e.g., "intact" vs. "broken").
- **Item Count**: `expectedItemCount`, `actualItemCount` (optional; used for quick sanity check).
- **Timestamps**: `handoverTime` (when custody transfer occurred), `acceptedTime` (when acknowledged).
- **Notes**: free text for anomalies.

**Permission Enforcement** (see section 14):
- `ORIGIN_TO_DRIVER`: accepted by the driver on their own trip only.
- `DRIVER_TO_DESTINATION`: accepted by facility staff (WAREHOUSE_STAFF / FACILITY_SUPERVISOR) at destination.
- `FACILITY_TO_PARTNER`: initiated by facility staff, accepted by partner.

### ReceivingReconciliation

Computes discrepancies between loaded and received cargo:

- **One-to-One with Manifest**: unique `(manifestId)` constraint ensures exactly one reconciliation per manifest.
- **Status**: `PENDING` → `IN_PROGRESS` → `{MATCHED, PARTIAL, DISCREPANCY}` → `RESOLVED` → `COMPLETED` | `CANCELLED`.
- **Compute Phase**: after recording received counts via `recordReconciliationCounts`, the service recomputes:
  - `matchedItemCount`: received == planned.
  - `missingItemCount`: received < planned.
  - `excessItemCount`: received > planned.
  - `damagedItemCount`: `receivingStatus=DAMAGED`.
  - `unidentifiedItemCount`: `receivingStatus=UNIDENTIFIED`.
  - Sets status to `DISCREPANCY` if any mismatches exist; else `MATCHED`.
- **Approval**: completing a `DISCREPANCY` reconciliation requires `FACILITY_SUPERVISOR` or higher (not general WAREHOUSE_STAFF).
- **Timestamps**: `startedAt`, `completedAt`, `completedBy` (user).

---

## 6. Task ↔ Trip ↔ Route ↔ Manifest Relationship

### Typical Workflow

1. **Dispatch Board**: Dispatcher creates a Trip manually or via a facility-transfer shortcut.
2. **Route Planning**: Dispatcher builds a Route with origin stop, intermediate stops, destination stop.
3. **Task Assignment**: Dispatcher links loading tasks (at origin) and unloading tasks (at destination/intermediate) to the Route's stops. The Task module's `assignTask` function now validates:
   - Task is routeable (not ADMIN/MANUAL).
   - Task is not already assigned elsewhere.
   - Task location matches route stop (facility match or geo proximity check deferred).
   - Loading tasks only assigned to origin-stop; unloading tasks only to non-origin stops.
   - Pickup before delivery (if same cargo).
   - Skill/vehicle-type match (existing TaskTypeConfig rules).
4. **Manifest Creation**: Origin facility staff create a Manifest for the Trip, add items (either from Shipments or manual).
5. **Loading**: Warehouse staff scan items as they load them into the vehicle, updating `ManifestItem.loadedQuantity` and `loadingStatus`.
6. **Sealing & Dispatch**: Facility supervisor seals the manifest (verifies item counts don't exceed vehicle capacity). Dispatcher marks the Trip as DISPATCHED; origin `FacilityHandover` is created (PENDING).
7. **In-Transit**: Driver marks RouteStops as EN_ROUTE, ARRIVED, etc. GPS/proof-of-delivery data is out of scope for MVP.
8. **Destination Arrival & Receiving**: Destination staff start UNLOADING and begin receiving items into the facility's system. A `ReceivingReconciliation` is initiated.
9. **Reconciliation**: Item-by-item receiving counts are recorded. Discrepancies (missing/excess/damaged) are detected and either automatically resolved or escalated.
10. **Manifest Closure**: Once reconciliation completes, the manifest is CLOSED. If a discrepancy is unresolved, a `TaskException` (manifestId) is spawned and optionally a follow-up task is created for investigation.
11. **Trip Completion**: Driver or dispatcher marks the Trip as COMPLETED (or PARTIALLY_COMPLETED / FAILED).

**Note**: Trip completion is independent of manifest closure. A Trip can be marked complete while its manifest is still reconciling.

### Why No `TRANSPORT_TASK`?

Tasks are the Task Module's concern; Trips are the Route Module's concern. Conflating them into a single `TRANSPORT_TASK` entity type would require the Task Module to grow route/manifest/handover semantics, or vice versa. The current design keeps concerns separate: Task handles execution (PLANNED → EN_ROUTE → COMPLETED); Trip/Route handle planning & orchestration. A driver executing a task on a trip sees the task (status, proof, exception), not the trip; a dispatcher planning a trip sees the route and manifest (capacity, stops, cargo), not individual tasks — until assignment time, when both views reconcile.

---

## 7. Lifecycle: Trip Status Transitions

```
DRAFT
  ├─→ PLANNING     (manually mark ready to plan; e.g., all core fields populated)
  ├─→ CANCELLED    (abort before any planning)

PLANNING
  ├─→ READY        (route finalized, vehicle/driver assigned, manifest ready)
  ├─→ CANCELLED

READY
  ├─→ DISPATCHED   (vehicle leaves origin; manifest sealed; origin handover initiated)
  ├─→ CANCELLED

DISPATCHED
  ├─→ IN_PROGRESS  (driver confirms start; vehicle is now moving)

IN_PROGRESS
  ├─→ PAUSED       (break, weather, etc.)
  ├─→ ARRIVED      (destination reached; not yet unloading)
  ├─→ PARTIALLY_COMPLETED  (failed/skipped some stops, but continuing; manual mark)
  ├─→ FAILED       (unrecoverable failure; replacement trip needed)

PAUSED
  ├─→ IN_PROGRESS  (resume)

ARRIVED
  ├─→ COMPLETED    (all tasks completed, manifest closed)
  ├─→ PARTIALLY_COMPLETED
  ├─→ FAILED       (destination facility rejected cargo)

COMPLETED, PARTIALLY_COMPLETED, FAILED, CANCELLED
  (terminal)
```

**Permission Gates**:
- DRAFT → PLANNING: Dispatcher (`WRITE_ROLES`).
- PLANNING → READY: Dispatcher.
- READY → DISPATCHED: Dispatcher + `FACILITY_SUPERVISOR` (dispatch approval gated to that role).
- IN_PROGRESS → PAUSED: Dispatcher or Driver (own trip).
- PAUSED → IN_PROGRESS: Dispatcher or Driver (own trip).
- ARRIVED / COMPLETED: Driver (own trip) or Dispatcher.
- FAILED / CANCELLED: Dispatcher only.

---

## 8. Lifecycle: Manifest & Handover & Reconciliation Transitions

### Manifest Status Progression

Linear path (no branching except cancellation and DISCREPANCY loop):

```
DRAFT
  → PLANNED (manually mark ready for loading)
  → LOADING (warehouse staff begins scanning items)
  → LOADED (all items loaded; await supervisor approval)
  → SEALED (supervisor confirms seal, item count, capacity checks)
  → DISPATCHED (vehicle leaves origin)
  → IN_TRANSIT (en-route; no state changes expected)
  → ARRIVED (destination received the manifest)
  → UNLOADING (destination warehouse begins unloading)
  → RECEIVING (item-by-item receiving reconciliation starts)
  → RECONCILING (counts recorded; computing discrepancies)
  → MATCHED (all items accounted for)
    → CLOSED (manifest closed)
  → DISCREPANCY (mismatch detected)
    → RESOLVED (discrepancy investigated + decision made)
    → CLOSED (manifest closed despite discrepancy)

Cancellable from any pre-DISPATCHED state.
```

### Handover Status

```
PENDING (awaiting acceptance)
  → IN_PROGRESS (recipient beginning custody transfer)
  → ACCEPTED (custody confirmed)
  → ACCEPTED_WITH_EXCEPTION (accepted, but documented anomaly)

PENDING
  → REJECTED (custody refused)

ACCEPTED, ACCEPTED_WITH_EXCEPTION, REJECTED
  (terminal)
```

### Reconciliation Status

```
PENDING (awaiting start)
  → IN_PROGRESS (receiving counts being recorded)
  → MATCHED (all counts align; ready to close)
    → COMPLETED
  → PARTIAL (some items unaccounted for, but decision made to close)
    → COMPLETED
  → DISCREPANCY (mismatch; needs investigation)
    → UNDER_INVESTIGATION (optional manual escalation state)
    → RESOLVED (decision made on how to handle)
    → COMPLETED

Any state → CANCELLED (if trip is cancelled mid-receive)
```

---

## 9. Business Rules as Implemented

### Assignment Checklist (Task ↔ Trip)

When assigning a Task to a Trip's Route:

1. **Task Routeability**: Task is `PICKUP`, `DELIVERY`, `PICKUP_AND_DELIVERY` (not `ADMIN` or `MANUAL`).
2. **Task State**: Task is `UNASSIGNED`, `ASSIGNED`, or `READY` (not `COMPLETED`, `CANCELLED`, `FAILED`).
3. **Uniqueness**: Task is not already assigned to another Trip/Stop (checked via RouteStopTask uniqueness).
4. **Location**: Loading task assigned to origin-stop (facilityId match); unloading task to non-origin stop.
5. **Time Window**: No overlap with existing tasks at the same stop (deferred; hardening rule).
6. **Skill/Capability**: Vehicle and driver capability match task requirements (reuse existing TaskTypeConfig validation).
7. **Cargo Dependency**: For same-shipment pickup-delivery pairs, pickup task assigned to an earlier stop than delivery task.
8. **Same Tenant**: Task and Trip both belong to same tenant.

### Dispatch Checklist (Pre-Departure)

Before allowing Trip status → DISPATCHED:

1. **Primary Driver**: Trip must have a `primaryDriverId`.
2. **Vehicle**: Trip must have a `vehicleId` (not strictly required; can be a foot courier, but at least one of vehicle/driver required).
3. **Manifest Sealed**: If manifest exists, status must be `SEALED` (or higher, or absent if no cargo).
4. **Capacity**: Hard check: loaded weight/volume/pallet count ≤ vehicle capacity. Soft warnings at 80%/90%. Overrides require `FACILITY_SUPERVISOR` + reason recorded in audit.
5. **No Critical Exceptions**: No open high-severity exceptions on the Trip or Manifest (low-severity exceptions are ok to ignore).
6. **Route Finalized**: Active route exists and has ≥ 2 stops (origin + at least one destination).
7. **All Tasks Routed**: Every task intended for the trip is assigned to a stop.

### Capacity Modeling (Simple, Non-Algorithmic)

- **Vehicle**: `capacityKg`, `capacityM3`, `capacityPallets` (denormalized from Vehicle at assignment time, stored in Trip).
- **Manifest**: `plannedLoadKg`, `plannedLoadM3`, `plannedLoadPallets` (sum of ManifestItem weights/volumes).
- **Dispatch Check**: `plannedLoad*` vs. `vehicleCapacity*`. Hard-block if exceeded; soft-warning at thresholds. Override requires reason in AuditLog.
- **Actual Load**: Driver confirms `actualLoadedQuantity` (item count) or scans items; may differ from planned.
- **No Optimization**: No automatic re-packing, no load-balancing algorithm. MVP is manual human planning.

### Reconciliation Compute

After `recordReconciliationCounts` is called:

```sql
SELECT
  COUNT(*) FILTER (WHERE r.receivedQuantity = p.plannedQuantity) AS matched,
  COUNT(*) FILTER (WHERE r.receivedQuantity < p.plannedQuantity) AS missing,
  COUNT(*) FILTER (WHERE r.receivedQuantity > p.plannedQuantity) AS excess,
  COUNT(*) FILTER (WHERE r.receivingStatus = 'DAMAGED') AS damaged,
  COUNT(*) FILTER (WHERE r.receivingStatus = 'UNIDENTIFIED') AS unidentified
FROM ManifestItem AS p
LEFT JOIN ReceivedCounts r ON p.id = r.manifestItemId
WHERE p.manifestId = ?
```

If any of `(missing + excess + damaged + unidentified) > 0`, status = `DISCREPANCY`; else `MATCHED`.

### Replacement Trip Flow

When a Trip fails mid-route (`status = FAILED`):

1. Dispatcher (or Operations Manager) calls `POST /trips/{id}/replacement`.
2. Service fetches the parent Trip, its Manifest, and all ManifestItems.
3. Filters out items with `receivingStatus = RECEIVED` (already successfully delivered).
4. Creates a new Trip with:
   - `tripType` same as parent (or override in request).
   - `parentTripId = parent.id`.
   - `status = DRAFT`.
   - Optionally new `vehicleId` / `primaryDriverId` (or inherit from parent).
5. Creates a new Manifest for the new Trip, copying remaining items with `sourceManifestItemId` lineage.
6. Copies the parent's Route, removing completed/skipped stops, and associates it with the new Trip.
7. Sets parent `Trip.replacementTripId = new_trip.id` and `Trip.replacementReason = provided reason`.
8. Emits `trip.replacement_created` domain event.
9. **Permission**: only `[TENANT_ADMIN, OPERATIONS_MANAGER]` (not general Dispatcher).

---

## 10. Audit Trail & Generic AuditLog

### Why a Generic Table?

The module specifies ~15 audit-worthy actions across 6 entity types (Trip, Route, Manifest, ManifestItem, FacilityHandover, ReceivingReconciliation):
- Vehicle/driver assignment, task add/remove on trip, route resequencing, manifest item add/remove, loading/receiving status, seal confirmation, handover acceptance, discrepancy creation, capacity override, replacement-trip creation.

A per-entity history table (`TripAuditLog`, `ManifestAuditLog`, etc.) would be 6 near-identical tables with `(entityId, action, before, after, actor, reason, timestamp)` — exactly the kind of accidental duplication this codebase otherwise avoids (see Partner.type, TaskShipment precedent).

`AuditLog` is a single table with:
- `entityType` (string, not enum; new types never need migration).
- `entityId`.
- `action` (string; e.g., `VEHICLE_ASSIGNED`, `MANIFEST_ITEM_ADDED`, `SEAL_CONFIRMED`).
- `beforeValue`, `afterValue` (JSON; captures field-level diffs for any entity).
- `reason` (e.g., capacity override, manual correction).
- `isOverride` (boolean; marks authorized overrides of validation).
- `actor` (User FK), `source` (WEB/API/MOBILE/SYSTEM), `deviceId`, `correlationId`, `clientRequestId` (for deduplication).

### Status History Tables (Kept Separate)

`TripStatusHistory` and `ManifestStatusHistory` are dedicated tables, distinct from `AuditLog`, because they serve a different purpose:
- They gate formal state-machine transitions (idempotent replay).
- They enforce `clientRequestId` uniqueness for exactly-once semantics on status changes.
- They are the canonical record for "how did this entity reach this state?"

`RouteStop` status changes go into `AuditLog` (fine-grained per-stop, not worth a dedicated table).

---

## 11. Optimistic Concurrency & Idempotent Replay

### Version-Based Concurrency

Every mutable resource carries a `version` (int, default 1). On update:

1. Client provides `expectedVersion`.
2. Service checks `DB.version == expectedVersion`. If not, return `409 ConflictError`.
3. On success, increment `DB.version := DB.version + 1`.

This prevents lost-update anomalies when concurrent requests race.

### Idempotent Replay via clientRequestId

History tables (TripStatusHistory, ManifestStatusHistory) include:
- `clientRequestId` (optional string, provided by client or generated server-side).
- Unique constraint: `(entityId, clientRequestId)`.

**Idiom**:
1. Client issues request with `clientRequestId=X`.
2. Service first checks: does a history row exist with this `clientRequestId`?
   - If yes, return the prior result (or 200 no-op).
   - If no, proceed with the mutation, record the history row with `clientRequestId=X`.

This ensures retrying the same request twice (e.g., network glitch causing re-submission) does not double-execute.

**Example**: Sealing a manifest twice with the same `clientRequestId` records the manifest as sealed once; the second request is a no-op.

---

## 12. Domain Events

All events are emitted **after** a `$transaction` resolves, never inside it. Slow event subscribers cannot block the database. The subscriber registry (domainEvents.subscribers.ts) is a stub-log extension point for future integrations (billing, notifications, analytics, CMS).

**Event Categories**:

| Category | Events | Use Cases |
|----------|--------|-----------|
| **Trip** | trip.created, trip.facility_transfer_created, trip.updated, trip.vehicle_assigned, trip.driver_assigned, trip.task_added, trip.task_removed, trip.ready, trip.dispatched, trip.started, trip.paused, trip.resumed, trip.completed, trip.partially_completed, trip.failed, trip.cancelled, trip.delayed, trip.capacity_exceeded, trip.exception_created, trip.replacement_created | Dispatch board refresh, driver notifications, billing segment, replacement workflow |
| **Route** | route.created, route.activated, route.resequenced, stop.arrived, stop.completed, stop.failed, destination_facility.arrived | Map updates, proof-of-delivery capture, ETA recalculation |
| **Manifest** | manifest.created, manifest.item_added, manifest.loading_started, manifest.item_loaded, manifest.verified, manifest.sealed, manifest.unloading_started, manifest.item_received, manifest.receiving_completed, manifest.discrepancy_detected, manifest.closed | Warehouse system sync, inventory updates, billing triggers |
| **Handover** | handover.origin_accepted, handover.destination_accepted | Custody audit trail, seal confirmation |
| **Reconciliation** | reconciliation.started, reconciliation.completed | Investigation workflow trigger, financial hold |

---

## 13. REST API Surface

### Trip Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/trips` | READ | List all trips with filters (status, driver, vehicle, facility, date range) |
| POST | `/trips` | WRITE | Create trip (manual or facility-transfer shortcut) |
| GET | `/trips/:id` | READ | Fetch trip + active route + manifest + tasks + statusHistory + handovers + reconciliations + exceptions |
| PATCH | `/trips/:id` | WRITE | Update trip (reschedule: change plannedStartTime/End, notes) |
| PATCH | `/trips/:id/status` | WRITE | Generic status transition |
| PATCH | `/trips/:id/vehicle` | WRITE | Assign vehicle |
| DELETE | `/trips/:id/vehicle` | WRITE | Unassign vehicle |
| PATCH | `/trips/:id/driver` | WRITE | Assign primary driver |
| DELETE | `/trips/:id/driver` | WRITE | Unassign primary driver |
| POST | `/trips/:id/secondary-drivers` | WRITE | Add secondary driver |
| DELETE | `/trips/:id/secondary-drivers/:driverId` | WRITE | Remove secondary driver |
| POST | `/trips/:id/tasks/:taskId` | WRITE | Assign task to trip |
| DELETE | `/trips/:id/tasks/:taskId` | WRITE | Unassign task (soft-removes RouteStopTask) |
| POST | `/trips/:id/tasks/bulk-add` | WRITE | Bulk assign tasks (per-item try/catch, BulkResult[]) |
| POST | `/trips/:id/tasks/bulk-remove` | WRITE | Bulk unassign tasks |
| GET | `/trips/:id/dispatch-check` | READ | Pre-dispatch readiness checklist |
| PATCH | `/trips/:id/ready` | WRITE | Mark ready |
| PATCH | `/trips/:id/dispatch` | WRITE + FACILITY_SUPERVISOR | Dispatch trip |
| PATCH | `/trips/:id/pause` | WRITE + DRIVER (own trip) | Pause |
| PATCH | `/trips/:id/resume` | WRITE + DRIVER (own trip) | Resume |
| PATCH | `/trips/:id/arrive` | WRITE + DRIVER (own trip) | Mark arrived |
| PATCH | `/trips/:id/complete` | WRITE + DRIVER (own trip) | Mark completed |
| PATCH | `/trips/:id/partial-complete` | WRITE | Mark partially completed |
| PATCH | `/trips/:id/fail` | WRITE | Mark failed |
| PATCH | `/trips/:id/cancel` | WRITE | Cancel |
| POST | `/trips/:id/replacement` | TENANT_ADMIN, OPERATIONS_MANAGER | Create replacement trip |
| POST | `/trips/:id/exceptions` | WRITE + DRIVER | Report exception |

### Route Endpoints

(Extend existing `/route-plans` routes)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/route-plans` | READ | List routes |
| POST | `/route-plans` | WRITE | Create route |
| GET | `/route-plans/:id` | READ | Fetch route + stops |
| PATCH | `/route-plans/:id` | WRITE | Update route metadata |
| DELETE | `/route-plans/:id` | WRITE | Deactivate route |
| POST | `/route-plans/:id/stops` | WRITE | Add stop (manual, from facility, from task) |
| PATCH | `/route-plans/:id/stops/:stopId` | WRITE | Update stop |
| DELETE | `/route-plans/:id/stops/:stopId` | WRITE | Remove stop |
| PATCH | `/route-plans/:id/sequence` | WRITE | Reorder stops (existing dispatch board logic) |
| POST | `/route-plans/:id/stops/merge` | WRITE | Merge same-location stops |
| POST | `/route-plans/:id/versions` | WRITE | Create new route version |
| PATCH | `/route-plans/:id/activate` | WRITE | Activate version (supersedes prior) |
| POST | `/route-plans/:id/copy` | WRITE | Copy route template |
| GET | `/route-plans/:id/versions` | READ | List version history |
| GET | `/route-plans/compare?fromId=&toId=` | READ | Side-by-side stop lists |
| POST | `/route-stops/:stopId/tasks/:taskId` | WRITE | Link task to stop (creates RouteStopTask) |
| DELETE | `/route-stops/:stopId/tasks/:taskId` | WRITE | Unlink task |
| PATCH | `/route-stops/:stopId/status` | WRITE + DRIVER (own trip) | Update stop arrival/departure times |

### Manifest Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/manifests` | READ | List manifests |
| POST | `/manifests` | WRITE | Create manifest |
| GET | `/manifests/:id` | READ | Fetch manifest + items |
| POST | `/manifests/:id/items` | WRITE | Add item (from shipment or manual) |
| PATCH | `/manifests/:id/items/:itemId/loading` | WRITE | Scan/load/damage status |
| PATCH | `/manifests/:id/items/:itemId/receiving` | WRITE | Record received quantity/condition |
| DELETE | `/manifests/:id/items/:itemId` | WRITE | Remove item |
| PATCH | `/manifests/:id/verify` | WRITE | Verify item counts |
| PATCH | `/manifests/:id/seal` | WRITE | Seal manifest (capacity check + override if needed) |
| PATCH | `/manifests/:id/status` | WRITE | Generic status transition |
| PATCH | `/manifests/:id/close` | WRITE + FACILITY_SUPERVISOR (for DISCREPANCY) | Close manifest |

### Handover Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/facility-handovers` | READ | List handovers |
| POST | `/facility-handovers` | WRITE | Create handover (usually automatic on dispatch) |
| GET | `/facility-handovers/:id` | READ | Fetch handover |
| PATCH | `/facility-handovers/:id/accept` | WRITE + WAREHOUSE_STAFF + FACILITY_SUPERVISOR + DRIVER | Accept handover (direction-aware validation) |
| PATCH | `/facility-handovers/:id/reject` | WRITE + FACILITY_SUPERVISOR | Reject handover |

### Reconciliation Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/receiving-reconciliation` | READ | List reconciliations |
| POST | `/receiving-reconciliation` | WRITE | Start reconciliation |
| GET | `/receiving-reconciliation/:id` | READ | Fetch reconciliation + recomputed counts |
| PATCH | `/receiving-reconciliation/:id/counts` | WRITE + WAREHOUSE_STAFF | Record received counts (triggers recompute) |
| PATCH | `/receiving-reconciliation/:id/complete` | WRITE + FACILITY_SUPERVISOR (if DISCREPANCY) | Complete reconciliation |
| POST | `/receiving-reconciliation/:id/discrepancies/:itemId/spawn-task` | WRITE | Spawn investigation task + exception |

---

## 14. Permission Model

### Roles

- **TENANT_ADMIN**: full access to all operations and data within tenant.
- **OPERATIONS_MANAGER**: all trip/route/manifest operations; replacement trips; reconciliation approval.
- **DISPATCHER**: trip/route/manifest creation, vehicle/driver assignment, dispatch approval (requires FACILITY_SUPERVISOR co-sign), task linking.
- **DRIVER**: view own trips/tasks, mark own trip status (started/paused/arrived/completed), accept own origin handovers, can NOT create trips or reassign vehicles.
- **WAREHOUSE_STAFF**: manifest loading/receiving, record reconciliation counts, facility handover acceptance at destination, can NOT dispatch or approve.
- **FACILITY_SUPERVISOR**: dispatch approval (co-sign with Dispatcher), seal approval with override, handover acceptance, reconciliation approval (including DISCREPANCY), can NOT create trips.
- **CUSTOMER_SERVICE**: read-only access (trips, manifests, exceptions).
- **FINANCE**: read-only access + billing-hold toggle on exceptions.
- **READ_ONLY**: read-only access.

### Permission Matrix

| Operation | TENANT_ADMIN | OPS_MGR | DISPATCHER | DRIVER | WAREHOUSE_STAFF | FACILITY_SUPERVISOR | CUSTOMER_SERVICE | FINANCE | READ_ONLY |
|-----------|---|---|---|---|---|---|---|---|---|
| Create Trip | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| Assign Vehicle | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| Assign Driver | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| Dispatch (Approval) | ✓ | ✓ |  |  |  | ✓ (co-sign) |  |  |  |
| Mark Trip Ready | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| Mark Trip Started | ✓ | ✓ | ✓ | ✓ (own) |  |  |  |  |  |
| Mark Trip Arrived | ✓ | ✓ | ✓ | ✓ (own) |  |  |  |  |  |
| Complete Trip | ✓ | ✓ | ✓ | ✓ (own) |  |  |  |  |  |
| Fail/Cancel Trip | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| Create Replacement Trip | ✓ | ✓ |  |  |  |  |  |  |  |
| Add Manifest Items | ✓ | ✓ | ✓ | | ✓ (receiving only) | ✓ |  |  |  |
| Seal Manifest | ✓ | ✓ | ✓ |  |  | ✓ (with override) |  |  |  |
| Record Receiving Counts | ✓ | ✓ | ✓ |  | ✓ | ✓ |  |  |  |
| Complete Reconciliation (DISCREPANCY) | ✓ | ✓ |  |  |  | ✓ |  |  |  |
| Accept Handover (ORIGIN_TO_DRIVER) | ✓ | ✓ |  | ✓ (own trip) |  |  |  |  |  |
| Accept Handover (DRIVER_TO_DESTINATION) | ✓ | ✓ |  |  | ✓ | ✓ |  |  |  |
| Toggle Billing Hold | ✓ | ✓ |  |  |  |  |  | ✓ |  |
| Read Trips | ✓ | ✓ | ✓ | ✓ (own) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read Manifests | ✓ | ✓ | ✓ | ✓ (own) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read Reconciliations | ✓ | ✓ | ✓ | ✓ (own) | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 15. Web UI

### Pages

- **TripListPage** (`/trips`): Searchable list of all trips with status, driver, vehicle, origin/destination; filters by date/status/type/facility.
- **TripDetailPage** (`/trips/:id`): Comprehensive trip view with tabs:
  - Summary: vehicle, driver(s), origin/destination, times.
  - Manifest: cargo items, loading/receiving status, seals.
  - Route: stop sequence, planned times, assigned tasks.
  - Tasks: tasks assigned to stops.
  - Handovers: origin/destination custody transfer status.
  - Reconciliation: received counts, discrepancies, exception spawning.
  - Exceptions: trip-level and manifest-level exceptions.
  - History: status transition timeline.
  - Audit Log: user actions on the trip.
- **TripCreatePage** (`/trips/new`): Form to create trip (manual or facility-transfer shortcut) with vehicle/driver selection.
- **FacilityReceivingPage** (`/facilities/:id/receiving`): Two-column layout for `FACILITY_SUPERVISOR`/`WAREHOUSE_STAFF` to queue manifest receiving and record reconciliation.
- **DispatchBoardExtensions**: Add Trip lanes (DRAFT, READY, DISPATCHED, IN_PROGRESS), Facility Transfers view, Manifest status chips per trip.

### New Primitives

- **CapacityBar**: Labeled utilization bar (kg/m³/pallets) with color gradient (green → yellow → red).

### Locale Keys

All keys namespaced under `trip.*`, `manifest.*`, `route.*`, `handover.*`, `reconciliation.*`, `facilityReceiving.*`. Enum values under `trip.status.*`, `manifest.status.*`, etc. Verified for parity between `en.json` and `id.json`.

---

## 16. Non-Functional Notes

### Caching

- Trip list queries are read-heavy; consider Redis caching for active trip list by status.
- Manifest item details rarely change after dispatch; safe to cache.
- Route stops are mutable during DRAFT phase; no caching until PLANNED.

### Concurrency

- Optimistic locking via `version` prevents lost updates.
- Database constraints (unique on `RouteStopTask(taskId)` WHERE active) enforce at-most-one assignment.
- Transaction isolation ensures multi-step operations (e.g., dispatch: update trip, create handover, update manifest) are atomic.

### Scalability

- Manifest item list may grow large (1000s of items per shipment). Paginate on receiving page.
- Trip list queries benefit from partial indexes on `(tenantId, status)`, `(tenantId, updatedAt)`.
- Route versioning adds table rows over time; periodic cleanup of superseded versions is recommended (not automated in MVP).

---

## 17. Testing

### Test Files (Vitest + Supertest)

1. **trips.lifecycle.test.ts**: Full happy path from DRAFT → COMPLETED with statusHistory and events.
2. **trips.dispatchValidation.test.ts**: Dispatch blocked without driver, sealed manifest, capacity exceeded.
3. **tasks.tripAssignment.test.ts**: Pickup-before-delivery, loading to origin only, task uniqueness.
4. **routes.versioning.test.ts**: Version chaining, stop copying, activate supersedes.
5. **manifests.capacity.test.ts**: Hard-block, soft-warning, override with reason, audit trail.
6. **receivingReconciliation.discrepancy.test.ts**: Missing/excess/damaged counts, exception spawning, FACILITY_SUPERVISOR gate.
7. **trips.replacement.test.ts**: Replacement lineage, item filtering, stop copying, OPERATIONS_MANAGER gate.
8. **idempotency.test.ts**: clientRequestId replay, no double-execution.

### Shared Package Tests

- **tripStatus.test.ts**: `canTransitionTripStatus` state machine.
- **manifestStatus.test.ts**: `canTransitionManifestStatus` linear progression.
- **handoverStatus.test.ts**: `canTransitionHandoverStatus`.
- **reconciliationStatus.test.ts**: `canTransitionReconciliationStatus`.

---

## 18. Deliberately Deferred (Extension Points)

The following are documented but not implemented in MVP:

- **Route Optimization**: `Route.optimizedBy`, `routeOptimizer` service, real distance/duration calculation. Placeholders exist; `RouteSource.OPTIMIZED` awaits a future engine.
- **GPS & Live Tracking**: Continuous breadcrumb tracking, live ETA recalculation. Route stop timestamps are manual/milestone-based for now.
- **Dynamic Reassignment**: Re-routing trips in-progress based on new orders or traffic. Fixed at dispatch time.
- **Dock Scheduling**: Appointment slots at facilities. Not modeled; assumed infinite dock capacity.
- **Cost Optimization**: Fuel/labor cost calculation, cost-per-km, margin analysis. `Trip.cost*` fields absent.
- **Map View**: No client-side map rendering (no mapping library). Trip Detail shows stop list only.
- **Automated Scan Tunnels**: IoT / barcode scanner integration. Manual entry only.
- **Partner Integration**: Third-party logistics partner linehaul management. Polymorphic handover actors are extensible for this.
- **File/Document Upload**: No file storage for proofs, photos, BOL. Trip Detail's "documents" section omitted.
- **Real Claims & Billing**: Flat `claimReference` / `billingHold` fields only. No full claims workflow.
- **Driver License Class Matching**: No vehicle.requiredLicenseClass field; assumed all drivers are compatible.
- **Geo Operating Areas**: No area-of-operation constraints. Any driver can be assigned any trip.
- **Offline Sync**: Mobile offline queuing is a client concern; `clientRequestId` idempotency covers duplicate-scan detection.
- **Level-2 Assisted Planning**: "Suggest next stop" feature for dispatch. Read APIs expose data (availability, time windows, capacity); no computation.

---

## 19. Verification Checklist

- [ ] `pnpm -r typecheck` passes.
- [ ] `pnpm -r test` passes (all 8 test suites + shared tests).
- [ ] curl smoke tests for each phase (trip CRUD, route versioning, manifest sealing, reconciliation, replacement).
- [ ] Playwright: facility-transfer trip end-to-end (dispatch board → create → seal → dispatch → receiving → complete).
- [ ] Locale parity: flatten-and-diff en.json ↔ id.json, no raw keys leaked.
- [ ] All role gates tested (Dispatcher can't replace, Driver can only self-act).
- [ ] Optimistic concurrency: 409 on stale version, successful retry with correct version.
- [ ] Idempotency: double-submit with same clientRequestId = no-op or idempotent 200.
- [ ] Domain events: all ~40 events logged to console (subscribers.ts stubs).

---

## 20. Glossary

| Term | Definition |
|------|-----------|
| **Handover** | Custody transfer of cargo between actors (facility ↔ driver ↔ partner). |
| **Lineage** | Parent-child relationship for replaced manifests/trips; tracks chain-of-custody. |
| **Manifest** | Cargo inventory for a Trip; binding between Trip and its items. |
| **Reconciliation** | Item-by-item receive count vs. planned count; detects discrepancies. |
| **RouteStop** | Single waypoint (pickup, delivery, break, fuel) within a Route sequence. |
| **RouteStopTask** | Historized junction: which Tasks are assigned to which RouteStops. |
| **Trip** | Complete operational journey: vehicle, route, driver, manifest, cargo. |
| **Version** | Optimistic-lock field; prevents lost updates on concurrent edits. |

