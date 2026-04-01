# Multi-Prize Raffle Campaign Design

## Status

Approved for specification. Waiting for implementation-plan approval after user review.

## Goal

Extend Rifaria from a single-prize raffle into a single sales campaign with multiple scheduled prizes, while keeping email delivery only for successfully paid purchases and making winning numbers public for every completed draw.

## Product Decisions

1. A user buys boletas once and, after payment approval, those paid boletas participate in all future prize draws within the same campaign.
2. A campaign contains multiple scheduled prizes such as cash drops, vehicles, houses, and a final major prize.
3. Winning numbers must be public and visible to all users on the public site.
4. Only successful payments trigger email delivery. No email is sent for initiated, pending, failed, expired, or released reservations.
5. A ticket that already won one prize becomes ineligible for future prizes in the same campaign.
6. The campaign keeps a single ticket pool. Prizes are separate draw events over that shared pool.
7. Draw results remain visible even when the winning number does not belong to any paid ticket.

## Current State

The current codebase assumes one active raffle with one prize and one draw date. Orders reserve random 4-digit tickets, move to `pending_payment`, assign those tickets on Wompi approval, release them on failure or expiration, and enqueue a ticket email after payment approval. The public site exposes only a single active raffle and a single prize narrative.

This already matches the desired email rule in spirit: the notification queue is triggered only after Wompi approval. The system does not yet support multiple prizes inside one campaign, public result history, ticket eligibility across multiple draws, or admin tooling for prize calendars and ticket inventory.

## Recommended Architecture

Use a campaign-centric model:

- `Raffle` remains the sales campaign container.
- Introduce a new child entity `PrizeDraw` for each scheduled prize inside the campaign.
- Keep `Order` and `Ticket` tied to the campaign, not to an individual prize.
- Settlement happens per `PrizeDraw`, not per campaign.

This is the cleanest fit for the business rule "buy once, participate in multiple dates" and avoids faking the feature with multiple loosely linked raffles.

## Domain Model

### Campaign

`Raffle` becomes a campaign shell with these responsibilities:

- campaign title and marketing copy
- hero image and public description
- ticket inventory and sold count
- campaign sale status
- default draw source text for prizes when needed

The campaign is still the single active sales object exposed on the public landing.

### Prize Draw

Create a new `PrizeDraw` collection referenced by `raffleId`.

Required fields:

- `raffleId`
- `title`
- `slug`
- `description`
- `prizeType`
  - `cash`
  - `vehicle`
  - `property`
  - `bundle`
  - `other`
- `displayValue`
  - examples: `$10.000.000`, `Moto Yamaha`, `Casa campestre`
- `imageUrl`
- `position`
  - display and settlement order within the campaign
- `drawAt`
- `drawSource`
- `status`
  - `scheduled`
  - `drawn`
  - `cancelled`
- `isMajorPrize`
- `winningNumber`
  - nullable until settled
- `drawResultSourceUrl`
  - public proof link or evidence URL
- `winningTicketId`
  - nullable when the winning number exists publicly but has no paid owner
- `winnerOrderId`
  - nullable
- `winnerFullNameSnapshot`
  - nullable
- `winnerMaskedEmailSnapshot`
  - nullable
- `settledAt`

Why a separate collection instead of embedded prize items:

- prize draws need their own lifecycle, queries, and admin actions
- ticket eligibility must reference a stable prize draw id
- public results and admin dashboards will query prize draws independently

### Ticket

Keep one ticket document per campaign purchase number, but extend it with prize eligibility state.

Add fields:

- `wonPrizeDrawId`
  - nullable
- `wonAt`
  - nullable

Rules:

- `reserved` tickets are not eligible for public winner resolution
- `assigned` tickets with `wonPrizeDrawId = null` are eligible for upcoming prize draws
- once a ticket wins, it remains assigned to the order but is excluded from future prize draws

This keeps the "one ticket wins at most once" rule explicit and queryable.

### Order

`Order` stays campaign-scoped. No change in core ownership model.

Minor additions:

- `emailSentAt`
  - nullable
- optional `emailDeliveryStatus`
  - `queued`
  - `sent`
  - `failed`

This makes notification state observable in admin and helps requeue support later.

## Draw Mechanics

Each `PrizeDraw` is settled independently.

Settlement flow:

1. Admin selects a scheduled prize draw.
2. Admin enters the official `winningNumber` and a `drawResultSourceUrl`.
3. System looks for an `assigned` ticket in the same campaign with:
   - matching `number4d`
   - `wonPrizeDrawId = null`
4. If found:
   - mark that ticket with `wonPrizeDrawId`
   - set `winningTicketId` and `winnerOrderId` on the `PrizeDraw`
   - snapshot masked winner identity fields for public display
5. If not found:
   - prize draw is still marked `drawn`
   - public result shows the winning number and `sin ganador`

Important business rule:

- One order may have multiple tickets.
- If one ticket from that order wins an early cash drop, the remaining tickets in that same order stay eligible for future prizes.
- Only the specific winning ticket is removed from the pool.

This preserves fairness while still rewarding larger purchases naturally.

## Purchase and Payment Flow

The purchase flow remains campaign-first.

1. User submits purchase data and quantity.
2. API creates the order.
3. API reserves unique 4-digit ticket numbers for 15 minutes.
4. Order moves to `pending_payment`.
5. UI redirects to Wompi checkout.
6. Wompi webhook approves or rejects the payment.
7. On approval:
   - tickets move from `reserved` to `assigned`
   - order moves to `paid`
   - sold count is recomputed
   - success email is queued
8. On failure or timeout:
   - reserved tickets are deleted
   - order becomes `failed` or `expired`
   - no email is sent

Email rule:

- Only send the post-purchase email after `paid`.
- Do not introduce a pre-payment confirmation email.
- Do not send emails for released reservations.

This matches the business requirement exactly and keeps inbox content aligned with durable ownership.

## Notification Behavior

Retain the existing paid-order email trigger and extend observability, not the trigger condition.

Email content should include:

- participant full name
- campaign title
- paid ticket numbers
- next upcoming prize draws summary
- payment confirmation language
- support link

Do not include:

- reservation-only tickets
- pending or expired ticket references

Optional future work, explicitly out of scope for this implementation:

- winner announcement emails
- failed payment emails
- draw reminder emails

## Public Experience

### Landing Page

The active campaign landing should expose:

- hero block for the active campaign
- upcoming prize calendar
- completed result board with public winning numbers
- current purchase module
- proof and trust sections

Required public prize states:

- `scheduled`
  - show title, date, type, and prize value
- `drawn with winner`
  - show winning number and winner summary
- `drawn without winner`
  - show winning number and label `sin ganador`

The public results block must remain visible after a prize is drawn. Results are not hidden after the next prize starts.

### Public Result Presentation

For each completed prize draw:

- prize title
- prize value
- draw date
- official source label
- public winning number
- proof link
- winner presence
  - `ganador confirmado`
  - or `sin ganador`

Winner identity on public pages should be masked:

- show first name plus city when available
- do not expose full email or phone publicly

### Thanks Page

The thank-you and order status page should show:

- order status
- paid ticket numbers only after approval
- upcoming prize draws the user is now eligible for

Pending orders must continue to hide ticket numbers publicly until payment approval.

## Admin Experience

The admin area needs to move from a simple dashboard to an operational campaign console.

### Campaign Overview

Show:

- campaign title and status
- total tickets
- reserved count
- assigned count
- remaining available count
- gross revenue
- number of buyers
- next scheduled prize

### Prize Management

Admin can:

- create a prize draw
- edit a prize draw
- reorder prize draws
- mark one prize as `major`
- settle a prize draw
- cancel a prize draw

Admin cannot:

- settle the same prize twice without an explicit guarded override flow
- delete a prize draw that is already drawn

### Ticket Inventory

Admin can inspect:

- available ticket count
- reserved ticket count
- assigned ticket count
- won ticket count
- searchable ticket numbers
- ticket status and owner order

Admin should be able to search by:

- ticket number
- order id
- buyer email
- buyer phone

### Buyers and Orders

Admin can view:

- latest paid orders
- pending or expired orders
- buyer identity
- assigned tickets
- email delivery state

This is read-heavy operational tooling, not a manual editing surface for tickets.

## API Changes

### Public API

Extend the active public raffle response so the web app can render:

- campaign summary
- upcoming prize draws
- completed prize draws
- featured prize metadata for hero rendering

Keep the order status endpoint returning paid ticket numbers only for `paid` orders.

### Admin API

Add campaign operations for:

- list prize draws
- create prize draw
- update prize draw
- reorder prize draws
- settle prize draw
- list buyers
- list ticket inventory with filters

### Settlement API

Add a dedicated admin endpoint for settling a single prize draw by id.

Input:

- `winningNumber`
- `drawResultSourceUrl`

Output:

- prize draw status
- winning number
- winner presence
- winner order summary if found

## Backward Compatibility and Migration

Migration strategy:

1. Create the `PrizeDraw` collection.
2. Backfill the current single-prize raffle into one initial `PrizeDraw` marked as major prize.
3. Keep the campaign public even if it initially has one draw only.
4. Once backfill is complete, public and admin code should read prize draws instead of assuming the campaign itself is the only prize.

Existing `prizeName` and `prizeImageUrl` on `Raffle` should become campaign-level presentation fields for the hero until the rest of the stack fully adopts dedicated featured-prize selection.

This avoids a brittle big-bang migration and preserves the current landing while the new prize schedule rolls out.

## Error Handling

Required guarded cases:

- no scheduled prize draws left
- attempt to settle a prize draw twice
- winning number not 4 digits
- prize draw id does not belong to active campaign
- approved payment without reserved tickets
- notification queue failure after payment approval

Behavior:

- payment approval must not be rolled back because email delivery fails
- email failure should be recorded for retry, not used to invalidate ownership
- draw settlement must be idempotent for already drawn prizes

## Security and Audit

Audit logs must capture:

- prize draw creation
- prize draw update
- prize draw settlement
- prize draw cancellation
- winning number publication
- email queueing for paid orders

Admin-only guards remain mandatory for all prize and ticket management endpoints.

Public endpoints must never expose full buyer PII.

## Testing Strategy

### Shared and Domain Tests

Add tests for:

- prize draw status transitions
- winning ticket eligibility
- one-ticket-one-win rule

### API Tests

Add tests for:

- paid order still queues exactly one email
- failed and expired orders queue no email
- settling a prize with a valid paid ticket marks the correct winner
- settling a prize with no matching paid ticket still records a public winning number
- later prize draws ignore tickets that already won earlier draws

### Worker Tests

Add tests for:

- paid-order email template still renders ticket numbers
- notification processor can mark delivery state
- no notification is attempted for unpaid orders

### Web Tests

Add tests or smoke checks for:

- public home renders prize calendar and public result board
- admin page renders prize management and inventory sections
- thanks page renders upcoming prize schedule for paid orders

## Out of Scope

This design does not include:

- automatic ingestion of official lottery results
- winner payout workflows
- tax document generation
- buyer-to-buyer ticket transfers
- allowing one ticket to win multiple prizes
- multi-campaign public catalog

## Recommended Implementation Order

1. Introduce `PrizeDraw` and ticket eligibility fields.
2. Backfill existing raffle data into the new model.
3. Extend settlement logic for per-prize winner resolution.
4. Expose public campaign plus results data.
5. Expand admin APIs.
6. Expand admin UI.
7. Refresh public UI and thanks page to consume the new campaign model.

## Acceptance Criteria

- A single paid purchase participates in multiple future prize draws inside one campaign.
- Only paid purchases trigger email delivery.
- Failed or expired reservations never trigger email delivery.
- A completed prize draw always exposes its public winning number.
- A winning ticket is excluded from future prize draws in the same campaign.
- Admin can manage prize schedule, inspect ticket inventory, and review buyers.
- Public pages visibly show upcoming prizes and completed winning numbers.
