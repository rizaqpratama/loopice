# Task Management Module

The operational layer of Loopice: who does the work, and when. Where a
Service Order captures *what* moves and a Shipment/ShipmentLeg captures
*the path it takes*, a **Task** is the unit of work a driver, warehouse
staff member, team, or partner actually executes -- pickup, delivery,
receiving, loading, sorting, inspection, and more. A Task may originate
from a Service Order or be created standalone, and the same model has to
express trucking, PUD, distribution, milk-run, warehouse handling, and
intercity transport alike -- it is a generic task engine, not one coupled
to a specific mile of a shipment's journey.

This document is the reference for the module as built. It is
documentation, not a spec to re-derive behavior from -- where this
document and the code disagree, the code is correct and this file is
stale.

## Domain model

### Task fields

| Field | Notes |
|---|---|
| `taskNumber` | `TSK-000123`, generated per tenant (count + retry-on-clash, same idiom as `ServiceOrder.orderNumber`/`ShipmentLeg.legSequence`) |
| `taskTypeId` | FK to `TaskTypeConfig` -- drives required fields/proof/assignee types, see below |
| `status` / `priority` | see Lifecycle below |
| `serviceOrderId`, `customerId` | optional -- a Task can exist without either |
| `tripId`, `routeId`, `stopId` | optional grouping -- see Fleet & grouping entities |
| `facilityId` | optional link to a `Station` acting as a facility |
| `assignedDriverId` / `assignedVehicleId` / `assignedStaffId` / `assignedTeamId` / `assignedPartnerId` | exactly the assignee types `AssigneeType` enumerates; a Task can carry more than one simultaneously (e.g. driver + vehicle) |
| `locationType`, `locationName`, `locationAddress`, `locationLatitude/Longitude`, `locationContactName/Phone`, `locationAccessNotes` | flat, **snapshotted at write time** from whichever source is set (facility/customer/partner) or entered directly when `locationType = CUSTOM`, so a later address edit on the source doesn't rewrite history |
| `scheduledDate`, `timeWindowStart/End`, `estimatedServiceDurationMinutes`, `actualStartTime`, `actualCompletionTime` | scheduling + SLA fields |
| `requiredSkills`, `requiredVehicleCapabilities` | plain `String[]` tags, matched against `Driver.skills` / `Vehicle.capabilities` on assignment |
| `instructions`, `notes`, `sequenceNumber` | free text + position within a route/trip |
| `parentTaskId` / `subtasks` | optional self-relation for composite work |
| `createdById`, `updatedById`, `createdAt`, `updatedAt` | standard audit columns |
| `version` | optimistic concurrency counter, see below |

All storage is UTC; the API never applies timezone conversion server-side.

### Location model

Deliberately **not** a separate `TaskLocation` model or JSON column --
flat scalar fields on `Task` itself, matching the
`ServiceOrder.originAddress`/`destAddress` convention already in the
codebase. The location is snapshotted at write time rather than living as
a live reference, so editing a facility's address later doesn't silently
rewrite what a driver was actually sent to for a task already in flight.

### Fleet & grouping entities

- **Driver** -- roster entry, optionally linked to a `User` (role
  `DRIVER`) via `userId` for mobile/self-service login. `skills: String[]`
  is matched against `Task.requiredSkills` on assignment.
- **Vehicle** -- `capabilities: String[]` matched against
  `Task.requiredVehicleCapabilities`. `type` is a free string (SME fleets
  vary too much to hardcode a picklist).
- **Team** / **TeamMember** -- a named group of `User`s with an optional
  leader; a Task can be assigned to a Team as a whole.
- **Partner** -- an external carrier/vendor a Task can be handed off to.
- **Route** -- a reusable or one-off **ordered template of stops**
  (`RouteStop`, `sequenceNumber`-ordered), e.g. a recurring milk run.
- **Trip** -- one **scheduled execution**: a driver + vehicle + date,
  optionally following a `Route`. `Task.tripId`, `Task.routeId`, and
  `Task.stopId` are independent references -- a Task can belong to a
  Route's stop sequence without belonging to any particular Trip yet.

### Configurable Task Type

`TaskTypeConfig` is a real per-tenant database table, not a hardcoded
enum -- adding or adjusting a task type is a data change, not a deploy.
Seeded with 14 defaults (Pickup, Delivery, Receiving, Loading, Unloading,
Sorting, Consolidation, Deconsolidation, Inspection, Customer Handover,
Partner Handover, Return, Transfer, Other). Fields read generically by
`tasks.service.ts` rather than switched on by code per `taskType`:

| Field | Effect |
|---|---|
| `allowedStatuses` | filters the base `TaskStatus` transition graph (empty = all 13 allowed) -- the entire "status can differ by type" mechanism, see `canTransitionTaskStatusForType` |
| `requiredFields` | whitelist of `Task` field names that must be present at creation |
| `requiredProofTypes` | `ProofType[]` that must be present to `complete`/`partial-complete` |
| `allowedAssigneeTypes` | restricts which of driver/vehicle/staff/team/partner can be set |
| `locationRequirement` | `NONE` / `FACILITY_ONLY` / `CUSTOMER_ADDRESS_ONLY` / `ANY` |
| `cargoRequirement` | `NONE` / `OPTIONAL` / `REQUIRED` linked shipments |
| `facilityRequirement` | boolean, independent of `locationRequirement` |
| `failureReasonCodes` | suggested `ExceptionType[]` for this task type (not enforced) |
| `completionChecklist` | definition-only `String[]`; no per-instance checklist persistence exists yet (flagged future work, not silently dropped) |

### Task ↔ Shipment linkage

`cargoItemIds`/`shipmentIds` both map to a single `TaskShipment` join
table against the **existing** `Shipment` model -- no parallel
`CargoItem` concept was introduced.

## Lifecycle

13 statuses, static transition edges filtered by the task type's
`allowedStatuses` allow-list:

```
DRAFT -> UNASSIGNED, CANCELLED
UNASSIGNED -> ASSIGNED, CANCELLED
ASSIGNED -> PLANNED, UNASSIGNED, CANCELLED
PLANNED -> READY, ASSIGNED, CANCELLED
READY -> EN_ROUTE, RESCHEDULED, CANCELLED
EN_ROUTE -> ARRIVED, FAILED, RESCHEDULED
ARRIVED -> IN_PROGRESS, FAILED
IN_PROGRESS -> COMPLETED, PARTIALLY_COMPLETED, FAILED
PARTIALLY_COMPLETED -> (terminal)
COMPLETED -> (terminal)
FAILED -> RESCHEDULED
RESCHEDULED -> ASSIGNED, PLANNED, READY, UNASSIGNED, CANCELLED
CANCELLED -> (terminal)
```

`COMPLETED`, `CANCELLED`, and `PARTIALLY_COMPLETED` are immutable --
corrective work happens via a new Task (linked through
`TaskException.followUpTaskId`), never by reopening a terminal one.

`canTransitionTaskStatus(from, to)` (packages/shared) is the static graph
above; `canTransitionTaskStatusForType(config, from, to)` additionally
filters by the task type's `allowedStatuses`. This pairing is the entire
rules mechanism -- deliberately not a general workflow/rules engine.

## Business rules as implemented

1. **Terminal-state immutability** -- enforced purely by `COMPLETED` /
   `CANCELLED` / `PARTIALLY_COMPLETED` having no outgoing edges in the
   transition graph; no separate guard exists or is needed.
2. **Dependency gating** -- a `FINISH_TO_START` predecessor must be
   `COMPLETED` before its successor can enter `EN_ROUTE`, `ARRIVED`,
   `IN_PROGRESS`, `COMPLETED`, or `PARTIALLY_COMPLETED`
   (`assertDependenciesSatisfied`, checked on every status-changing call).
3. **Driver/vehicle availability** -- assignment checks the assignee's
   other **active-status** tasks (`ASSIGNED`/`PLANNED`/`READY`/
   `EN_ROUTE`/`ARRIVED`/`IN_PROGRESS`) for an overlapping
   `timeWindowStart`/`timeWindowEnd`; a task with no window skips the
   check entirely. "Availability" here means schedule/time-window
   conflict detection against other tasks -- not live GPS/telematics,
   which doesn't exist in this codebase.
4. **Capability matching** -- `requiredSkills ⊆ driver.skills` and
   `requiredVehicleCapabilities ⊆ vehicle.capabilities`.
5. **Permission-gated override** -- assignment accepts `override: true` +
   a mandatory `overrideReason`, which skips both the availability and
   capability checks and is recorded on the resulting
   `TaskStatusHistory` row (`isOverride`, `overrideReason`).
6. **Cancellation requires a reason** -- `reason` is a required, non-empty
   field on `PATCH /tasks/:id/cancel` (zod `min(1)`).
7. **Reschedule captures the prior schedule** -- `PATCH /tasks/:id/reschedule`
   moves the task to `RESCHEDULED` (only reachable from `READY`,
   `EN_ROUTE`, or `FAILED`) and writes `previousScheduledDate`/
   `previousTimeWindowStart`/`previousTimeWindowEnd` onto the
   `TaskStatusHistory` row before applying the new schedule, alongside a
   required `reason`.
8. **Failure opens an exception atomically** -- `PATCH /tasks/:id/fail`
   transitions to `FAILED` and creates an `OPEN` `TaskException` in the
   same transaction.
9. **Dependency cycle rejection** -- adding an edge runs a depth-capped
   (`MAX_CYCLE_CHECK_DEPTH = 50`) BFS forward from the would-be successor;
   if it reaches the would-be predecessor, the edge is rejected. A simple
   validated graph, not a generic graph library.
10. **DRAFT-only deletion** -- `DELETE /tasks/:id` only succeeds while the
    task is still `DRAFT` (mirrors `ShipmentLeg`'s PLANNED-only delete
    rule).
11. **DRIVER row-ownership** -- a `DRIVER`-role caller only ever sees and
    acts on tasks assigned to their own linked `Driver` row
    (`assertOwnsOrPrivileged`, see Permission model below).
12. **Optimistic concurrency on every mutation** -- see below.
13. **Idempotent replay** -- see below.

## Proof of Completion

`TaskProofOfCompletion` rows are appended by `complete`,
`partial-complete`, or the standalone `POST /tasks/:id/proof`. `ProofType`
covers 10 kinds: `PHOTO`, `SIGNATURE`, `RECIPIENT_NAME`, `GPS_LOCATION`,
`TIMESTAMP`, `QUANTITY_CONFIRMATION`, `CONDITION_CONFIRMATION`, `NOTE`,
`DOCUMENT_ATTACHMENT`, `BARCODE_SCAN`. `fileUrl` is a plain string the
client obtains elsewhere -- there is no file-upload infrastructure in
this codebase (flagged future work).

## Exceptions

`TaskException` has its own lifecycle, independent of the parent Task's:

```
OPEN -> ASSIGNED -> RESOLVED -> CLOSED
```

`resolution` is required to move an exception to `RESOLVED`
(`updateException` enforces it). 14 `ExceptionType` values cover customer/
address/access issues, cargo issues, vehicle/driver/facility issues, and
process issues (missort, incorrect cargo, capacity exceeded, etc.), each
with a `severity` (`LOW`/`MEDIUM`/`HIGH`/`CRITICAL`). `followUpTaskId`
links a resolved exception to a newly-created corrective Task rather than
reopening the original.

## Optimistic concurrency

Every mutating endpoint takes `expectedVersion: number`. The check is an
atomic compare-and-swap **inside** the transaction, not a pre-read
comparison (which would be TOCTOU-unsafe):

```ts
const result = await tx.task.updateMany({
  where: { id, version: expectedVersion },
  data: { status, version: { increment: 1 } },
});
if (result.count === 0) throw new ConflictError(/* stale version */);
```

A stale `expectedVersion` returns `409`. Every task response includes
`version`; clients must round-trip whatever `version` they last read.

## Idempotent replay

Mutating calls accept an optional `clientRequestId`. `TaskStatusHistory`
has a unique index on `(taskId, clientRequestId)`; if a request replays
with the same key, the service short-circuits to a fresh fetch (a no-op),
not an error -- a light, Task-scoped mechanism rather than a generic
Idempotency-Key table.

## Domain events

`apps/api/src/lib/domainEvents.ts` is a typed wrapper over Node's
built-in `EventEmitter` -- one module-level singleton, no new package.
Services call `domainEvents.emitTyped(...)` **after** the `$transaction`
resolves, never inside it, so a rolled-back write never fires an event
and a slow subscriber never blocks the DB transaction. Covered events:

`task.created`, `task.assigned`, `task.unassigned`, `task.status_changed`,
`task.rescheduled`, `task.completed`, `task.partially_completed`,
`task.failed`, `task.cancelled`, `task.exception_reported`,
`task.exception_resolved`.

`domainEvents.subscribers.ts` registers one stub subscriber (logs each
event) from `server.ts` on boot -- this is the extension point for a
future notification/billing/routing/tracking/analytics integration, not
an implementation of those consumers.

## REST API surface

| Verb & path | Roles | Notes |
|---|---|---|
| `POST /service-orders/:serviceOrderId/tasks` | TENANT_ADMIN, OPERATIONS_MANAGER, DISPATCHER | nested create |
| `POST /tasks` | same | manual create |
| `GET /tasks` | + WAREHOUSE_STAFF, CUSTOMER_SERVICE, FINANCE, READ_ONLY, DRIVER (own only) | filters: status[], taskTypeId, priority, assignedDriverId/VehicleId/TeamId/PartnerId, tripId, routeId, facilityId, customerId, serviceOrderId, scheduledFrom/To, unassigned, search, page/limit |
| `GET /tasks/:id` | same read roles; DRIVER via ownership check | |
| `PATCH /tasks/:id` | TENANT_ADMIN, OPERATIONS_MANAGER, DISPATCHER | core field edits |
| `PATCH /tasks/:id/status` | + DRIVER (own) | generic forward transitions |
| `PATCH /tasks/:id/reschedule` | TENANT_ADMIN, OPERATIONS_MANAGER, DISPATCHER | reason required |
| `PATCH /tasks/:id/cancel` | same | reason required |
| `PATCH /tasks/:id/assign` / `/unassign` | same | availability/capability re-validated server-side regardless of caller |
| `PATCH /tasks/:id/complete` / `/partial-complete` / `/fail` | + DRIVER (own) | `/fail` atomically opens a `TaskException` |
| `DELETE /tasks/:id` | TENANT_ADMIN, OPERATIONS_MANAGER, DISPATCHER | DRAFT-only |
| `POST /tasks/bulk-assign` / `/tasks/bulk-status` | same | per-item try/catch, partial failure reported per task id |
| `POST /tasks/:id/dependencies`, `GET .../dependencies`, `DELETE .../dependencies/:id` | write roles + broader read | |
| `POST /tasks/:id/proof` | + DRIVER (own) | |
| `POST /tasks/:id/exceptions` | + DRIVER (own) | |
| `PATCH /task-exceptions/:id` | TENANT_ADMIN, OPERATIONS_MANAGER, DISPATCHER | assign/severity/resolution/close via one action-ish PATCH |
| `GET/POST/PATCH/DELETE /task-types`, `/drivers`, `/vehicles`, `/teams`, `/partners` | TENANT_ADMIN write; broader read | split-RBAC-per-route, mirrors `stations` |
| `POST /teams/:teamId/members`, `DELETE .../members/:userId` | TENANT_ADMIN | |
| `GET/POST/PATCH /trips`, `PATCH /trips/:id/status`, `PATCH/DELETE /trips/:id/tasks/:taskId` | TENANT_ADMIN, OPERATIONS_MANAGER, DISPATCHER | |
| `GET/POST/PATCH/DELETE /route-plans`, `POST .../stops`, `PATCH .../sequence`, `DELETE /route-stops/:id` | same | dispatch-board sequence reorder |

## Permission model

`UserRole`: `SUPERADMIN`, `TENANT_ADMIN`, `OPERATIONS_MANAGER`,
`DISPATCHER`, `DRIVER`, `WAREHOUSE_STAFF`, `CUSTOMER_SERVICE`, `FINANCE`,
`READ_ONLY`. Every module below `TENANT_ADMIN` follows a WRITE_ROLES /
READ_ROLES split:

- **Write access** to operational data (tasks, service orders, shipments,
  customers) -- `TENANT_ADMIN`, `OPERATIONS_MANAGER`, `DISPATCHER`.
- **Write access** to master/reference data (stations, drivers, vehicles,
  teams, partners, task types) -- `TENANT_ADMIN` only.
- **Read access** to operational data -- the write roles plus
  `WAREHOUSE_STAFF`, `CUSTOMER_SERVICE`, `FINANCE`, `READ_ONLY`.
- **User account management** -- write stays `TENANT_ADMIN`-only even
  though everything else widened; read opens to `OPERATIONS_MANAGER` and
  `READ_ONLY`.
- **`DRIVER`** -- granted route-level access to task read/status/complete/
  partial-complete/fail/proof/exception endpoints, but
  `apps/api/src/lib/assertOwnsOrPrivileged.ts` confines every one of those
  calls to tasks assigned to that driver's own `Driver` row (resolved via
  `Driver.userId`); `GET /tasks` silently forces the `assignedDriverId`
  filter to the caller's own driver row, ignoring whatever the client
  sent. Write endpoints that move a task between drivers (assign/
  unassign/cancel/reschedule/delete/bulk-*) stay dispatcher-only even for
  a driver acting on their own task.

## Web UI

- **Task Pool** (`/tasks`) -- status filter chips, task-type/driver
  multi-select `Combobox`, search, unassigned-only toggle, bulk-select
  `Checkbox` column, bulk-assign `Dialog`, bulk-cancel.
- **Task Detail** (`/tasks/:id`) -- `Tabs`-based (Overview, Assignment,
  Cargo, Dependencies, Activity), status-dependent action buttons mapped
  through `actionKindFor(from, to)` to the matching simple call or
  structured `Dialog` (assign/unassign/cancel/reschedule/fail/complete/
  partial).
- **Dispatch Board** (`/dispatch`) -- `@dnd-kit`-based: an Unassigned pool
  lane plus one lane per active driver. Drag-and-drop is UI sugar only --
  every drop resolves to the same `PATCH /tasks/:id/assign` /
  `/unassign` / route-sequence-reorder call any other client would use,
  and the board always reconciles to the real API response (reloading
  after success *and* failure) rather than assuming the drag succeeded.

## Non-functional notes

- **Multi-tenant**: shared database, every tenant-scoped table carries
  `tenantId`; every service function takes `tenantId` explicitly and
  scopes every query by it.
- **Audit trail**: no generic audit-log table -- `TaskStatusHistory` is
  the per-entity trail, widened beyond the Service-Order/leg pattern to
  also carry reschedule and override fields.
- **UTC storage**: all `DateTime` columns are stored and compared in UTC;
  no server-side timezone conversion.
- **Modular monolith**: one Express app, one Postgres database -- no
  microservices. `domainEvents` is the seam a future extraction would cut
  along, not a justification for one now.

## Testing

`apps/api` and `packages/shared` both run on `vitest` (the repo's first
test runner). `apps/api` additionally uses `supertest` against the
exported `app` (not a bound port) for integration coverage, running
against the same dev Postgres database the rest of this project's manual
verification uses -- each test creates its own uniquely-named fixtures
rather than depending on fixed seed IDs, so the suite is safe to re-run
without a reset.

- `packages/shared/tests/taskTypeAware.test.ts` -- unit coverage of
  `canTransitionTaskStatusForType`'s edge cases (empty allow-list, a
  statically-invalid edge, a statically-valid edge outside the allow-list,
  terminal-state immutability).
- `apps/api/tests/tasks.lifecycle.test.ts` -- one full walk from `DRAFT`
  through every intermediate status to `COMPLETED`, asserting the
  status-history row count, version increments on every mutation, the
  required proof is recorded, the resulting `COMPLETED` task rejects
  further transitions, and the expected domain events fired.
- `apps/api/tests/tasks.businessRules.test.ts` -- one test per
  highest-risk rule: `CANCELLED` immutability, cancellation requiring a
  reason, stale-version `409`, failure opening an exception, reschedule
  capturing the prior schedule, driver double-booking rejection (and its
  override escape hatch), `FINISH_TO_START` dependency gating and
  unblocking, dependency cycle rejection, and bulk-assign partial
  failure reporting.

Run with `pnpm test` from the repo root (or `pnpm --filter @loopice/api
test` / `pnpm --filter @loopice/shared test` individually).

## Deliberate simplifications (not gaps to silently fill later)

- No generic workflow/rules engine -- the status graph + per-type
  allow-list is the entire mechanism.
- No generic graph library for dependencies -- a depth-capped BFS is
  enough for a task-scoped DAG.
- No file-upload infrastructure -- `TaskProofOfCompletion.fileUrl` is a
  plain string.
- No per-instance checklist persistence -- `TaskTypeConfig.completionChecklist`
  is a definition only.
- No generic audit-log or Idempotency-Key table -- both are Task-scoped
  (`TaskStatusHistory`, `clientRequestId` + unique index).
- `Vehicle.type` / `Partner.type` are free strings, not enums.
- "Availability" is schedule/time-window conflict detection, not live
  GPS/telematics.
