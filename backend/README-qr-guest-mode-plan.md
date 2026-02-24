# QR Guest Mode (No-Login) – Backend Module Plan (NestJS)

## Goals
- Customers scan **table QR** and can:
  - browse menu, create **draft orders**
  - call waiter (notification)
  - request bill (notification / state)
- **No login** for customers → strong session + device + table security.
- Draft/Unapproved orders must not pollute main `orders` tables until **confirmed**.
- When table changes / customer leaves → any open QR sessions should be **revoked** and clients disconnected.

## High-Level Architecture
- New backend module: `qr-guest`
- Uses existing:
  - `menus` for reading menu items
  - `orders` for final order creation
  - `notifications` (Socket.IO gateway) for waiter calls / bill requests / session revoke events
  - `tables` for table validation
  - Redis for short-lived session + rate limiting + idempotency (recommended)

## Core Concept
### 1) Table QR Token (Signed)
QR code encodes a **signed token** that identifies the table and restaurant.
- Payload:
  - `restaurantId`
  - `tableId`
  - `qrVersion`
  - `issuedAt`
- Signature: HMAC (server secret) or asymmetric JWT (recommended).
- Token is static (printed QR) but **can be rotated** via `qrVersion` stored on `Table`.

Validation rules:
- token signature valid
- `tableId` exists + belongs to restaurant
- token `qrVersion` matches current `tables.qr_version`

### 2) Guest Session (Ephemeral)
Upon opening QR link, client calls `POST /guest/sessions` with QR token.
Server creates a `guestSession`:
- `sessionId` (UUID)
- `tableId`, `restaurantId`
- `deviceFingerprintHash` (optional)
- `status`: `active | revoked | expired`
- `createdAt`, `expiresAt` (e.g. 2h)
- stored in **Redis** (fast revoke) + optionally DB for audit.

Client receives:
- `guestAccessToken` (short JWT) with `sessionId` + tableId
- used for HTTP + Socket auth.

### 3) Draft Order vs Final Order
Two-stage order flow:
1) **DraftOrder** (guest)
2) **Order** (real system)

This solves:
- moderation / validation
- “pending approval” UX
- prevents garbage in main order tables

## Data Model Options
### Option A (Recommended): Separate Table `guest_orders`
**guest_orders**
- `id`
- `restaurant_id`
- `table_id`
- `session_id`
- `status`: `DRAFT | SUBMITTED | APPROVED | REJECTED | EXPIRED | CONVERTED`
- `items_json` (JSONB)
- `notes`
- `total_amount`
- `created_at`, `updated_at`

**guest_order_events** (optional audit)
- `id`, `guest_order_id`, `type`, `payload_json`, `created_at`

Pros:
- clean separation
- simple expiry
- safe to purge

### Option B: Single `orders` table with status + source
Not recommended unless you need unified analytics.

## API Surface (HTTP)
### Session
- `POST /guest/sessions`
  - body: `{ qrToken, deviceInfo? }`
  - returns: `{ guestAccessToken, session, menuContext }`
- `POST /guest/sessions/:id/heartbeat`
  - keeps session active
- `POST /guest/sessions/:id/close`
  - client closes when leaving

### Menu (read-only)
- `GET /guest/menu?restaurantId=...` (or inferred from session)

### Draft Orders
- `POST /guest/orders`
  - auth: guestAccessToken
  - creates DRAFT
- `PUT /guest/orders/:id`
  - update items while draft
- `POST /guest/orders/:id/submit`
  - moves to SUBMITTED
- `GET /guest/orders/:id`

### Convert / Approve
Approval happens by staff UI (existing app) via authenticated endpoints:
- `POST /guest/orders/:id/approve`
  - creates real `Order` + `OrderItems`
  - marks guest_order as CONVERTED
- `POST /guest/orders/:id/reject`
  - sets REJECTED

### Waiter Call / Bill Request
- `POST /guest/requests/waiter`
- `POST /guest/requests/bill`
  - both emit socket event to staff room.

## Socket.IO Design
### Namespaces / Rooms
- Use existing gateway or create new `GuestGateway`.
- Rooms:
  - `restaurant:{restaurantId}` (staff)
  - `table:{tableId}` (staff watchers)
  - `guestSession:{sessionId}` (guest)

### Events
Guest → Server:
- `guest:join` (auth via guest token)
- `guest:order:submit`
- `guest:request:waiter`
- `guest:request:bill`
- `guest:heartbeat`

Server → Guest:
- `guest:session:revoked`
- `guest:order:status_changed` (submitted/approved/rejected)
- `guest:bill:status` (requested/paid)

Server → Staff:
- `ops:waiter_call`
- `ops:bill_request`
- `ops:guest_order_submitted`
- `ops:guest_session_opened/closed`

## Security Plan (No-Login)
### 1) QR Token Security
- signed token + `qrVersion` rotation
- short payload, no PII
- rate limit session creation per IP

### 2) Guest Session Token
- short-lived JWT (5–15 minutes) + refresh via heartbeat OR opaque token stored in Redis
- bind to:
  - `sessionId`
  - `tableId`
  - optional `deviceFingerprintHash`

### 3) Rate limiting + abuse prevention
- `POST /guest/orders` and `.../submit` rate limited
- `waiter/bill` requests rate limited (e.g. 1 per 60s)

### 4) Input validation
- only allow menu items existing in restaurant
- prevent price tampering by recalculating totals server-side

### 5) Idempotency
- guest submits can include `clientRequestId` to prevent duplicates.

## Session Revoke / Table Change Handling
### When to revoke
- table is marked `OUT_OF_SERVICE`
- table is moved to another area OR physically re-assigned
- customer leaves (staff action)
- bill paid & table reset

### How to revoke
- backend sets session status to `revoked` in Redis
- emits `guest:session:revoked` to `guestSession:{sessionId}` room
- disconnect sockets for that session

### How to find sessions to revoke
- maintain Redis set: `table:{tableId}:sessions = [sessionId...]`
- on revoke: iterate and mark all

## NestJS Module Breakdown
### `src/modules/qr-guest/`
- `qr-guest.module.ts`
- `controllers/guest-sessions.controller.ts`
- `controllers/guest-orders.controller.ts`
- `controllers/guest-requests.controller.ts`
- `services/guest-sessions.service.ts`
- `services/guest-orders.service.ts`
- `services/guest-requests.service.ts`
- `gateways/guest.gateway.ts` (or extend notifications gateway)
- `guards/guest-auth.guard.ts`
- `strategies/guest-jwt.strategy.ts`
- `dto/` (create session, draft order, submit, request waiter/bill)
- `entities/guest-order.entity.ts` (+ events)

Integration points:
- OrdersModule: conversion use-case `convert-guest-order.use-case.ts`
- NotificationsModule: emit events

## Conversion Workflow (Guest → Real Order)
1) Staff approves guest order
2) backend transaction:
   - validate guest_order status SUBMITTED
   - create `Order`
   - create `OrderItems`
   - mark guest_order CONVERTED + link `orderId`
3) emit:
   - to guest: `guest:order:status_changed = APPROVED`
   - to staff: `ops:guest_order_converted`

## Suggested Next Steps
1) Decide storage: Redis-only vs Redis + DB (`guest_orders` table)
2) Decide QR token format: signed JWT vs HMAC token
3) Implement minimal MVP:
   - session create + join socket
   - draft order create/submit
   - waiter call
   - staff approve converts to real order
4) Add session revoke hooks on table reset / payment complete.
