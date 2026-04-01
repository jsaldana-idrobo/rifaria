# Free Mode Inline Notifications Design

## Status

Approved at the approach level. Waiting for spec review before implementation.

## Goal

Allow Rifaria to run without a paid background worker by sending post-payment emails directly from the API and by handling reservation cleanup through a scheduled free mechanism, while preserving a clean path back to the existing `queue + worker` model later.

## Problem

The current production shape is:

- `apps/web` on Vercel
- `apps/api` on Vercel
- `apps/worker` intended for a persistent BullMQ worker

The paid-order email and expired reservation cleanup currently depend on `apps/worker`. Without that worker process:

- approved orders can remain with notification work enqueued but unsent
- expired reservations are not cleaned continuously

For a free launch, the system needs to keep the public purchase flow working without adding a paid worker host right now.

## Product Decisions

1. Paid purchase confirmation emails must still be sent only after successful payment approval.
2. Failed, pending, or expired reservations must not generate emails.
3. The free setup must work with the current Vercel deployment for `web` and `api`.
4. The design must preserve a future migration path back to `queue + worker` with minimal code churn.
5. Reservation cleanup can be delayed a few minutes in free mode, but payment confirmation email should remain near-immediate.

## Recommended Architecture

Use a dual-mode notification architecture with a free default runtime mode:

- `inline` mode for free operation
- `queue` mode for future paid worker operation

In `inline` mode:

- the API sends the paid-order email immediately after payment approval
- the API updates order email delivery state itself
- BullMQ is not required for the paid email path

Reservation cleanup moves to a secure internal API endpoint that can be triggered by a free scheduler.

Recommended free scheduler:

- GitHub Actions scheduled workflow every 5 minutes

Future paid mode:

- switch environment configuration to `queue`
- restore the existing worker-based path without changing business behavior

## Why This Approach

This is the best trade-off for launch:

- email remains close to real-time
- no paid background worker is required
- Vercel keeps serving the user-facing traffic
- the queue-based design is not thrown away

Alternative approaches were rejected:

- `Vercel Cron` alone is too limited for this use case on free plans
- batching emails in GitHub Actions would degrade the payment confirmation experience
- running the full worker locally or on a personal machine is operationally fragile

## Runtime Modes

Introduce an environment variable in the API:

- `NOTIFICATIONS_MODE=inline | queue`

Behavior:

- `inline`: API sends emails directly and does not enqueue BullMQ notification jobs
- `queue`: API preserves the current queue-based behavior and expects `apps/worker` to be alive

Default behavior for launch:

- production on Vercel should use `inline`

Future paid worker setup:

- change `NOTIFICATIONS_MODE=queue`
- keep `apps/worker` deployed on Render or another persistent host

## Email Delivery In Inline Mode

The API will own the paid-order email send in free mode.

Flow after Wompi approval:

1. assign reserved tickets
2. mark order as `paid`
3. compute upcoming prize draws
4. render the existing paid-ticket email template
5. send email through the configured provider
6. update `emailDeliveryStatus`
   - `sent` on success
   - `failed` on provider error

Important rule:

- email send failure must not roll back ticket assignment or paid order state

That matches the current operational intent: payment truth comes from Wompi approval, not from email delivery.

## Shared Notification Logic

The email rendering and provider integration should not live only in `apps/worker` anymore.

Move the reusable email logic into the API side as application services, reusing the same HTML structure and provider behavior already proven in the worker.

Required API capabilities:

- render paid-order email HTML
- render postponement email HTML
- send through `resend` or `postmark`
- update order delivery metadata

This keeps the free mode self-contained and also avoids duplicating payment-specific behavior inside controllers.

## Postponement Notifications

`postponeRaffle(... notifyParticipants=true)` should also respect `NOTIFICATIONS_MODE`.

- `inline`: API sends participant emails directly
- `queue`: API enqueues the postponement notification job as today

This keeps admin behavior consistent between both modes.

## Reservation Cleanup In Free Mode

Expired reservation release needs to stop depending on the persistent worker.

Introduce an internal API endpoint that:

- scans for `pending_payment` orders with expired `expiresAt`
- marks them `expired`
- deletes reserved tickets for those orders
- returns a small summary payload

This logic must remain idempotent and safe to run repeatedly.

Security rule:

- endpoint must require a shared secret header
- requests without the secret return `401`

Suggested header:

- `x-maintenance-token`

Suggested env variable:

- `MAINTENANCE_TOKEN`

## Free Scheduler

Use GitHub Actions scheduled workflow as the free trigger.

Workflow behavior:

1. run every 5 minutes
2. call the secure maintenance endpoint on `rifaria-api.vercel.app`
3. pass the secret header
4. fail loudly if the endpoint returns non-2xx

This is acceptable for free mode because reservation cleanup is not user-facing in the same way as payment confirmation email.

Operational caveat:

- GitHub scheduled jobs can be delayed
- the user-visible impact is that some expired reserved numbers may remain blocked a bit longer than 15 minutes

That is acceptable for launch, but it is a reason to move back to a persistent worker later.

## Environment Variables

### API

Add:

- `NOTIFICATIONS_MODE`
  - `inline` for free mode
  - `queue` for future worker mode
- `EMAIL_REPLY_TO`
- `RESEND_API_KEY`
- `POSTMARK_SERVER_TOKEN`
- `POSTMARK_MESSAGE_STREAM`
- `MAINTENANCE_TOKEN`

Validation rules:

- if `NOTIFICATIONS_MODE=inline`, email provider configuration must be valid in the API
- if `NOTIFICATIONS_MODE=queue`, email provider config may remain unused by the API
- `MAINTENANCE_TOKEN` must be strong and non-placeholder in production if the cleanup endpoint is enabled

### Worker

No immediate runtime change is required for free mode because the worker will not be deployed.

The worker configuration remains for future paid mode.

## API Surface Changes

Add a protected maintenance route under `/v1/internal` or `/v1/system`.

Recommended route:

- `POST /v1/internal/maintenance/release-expired-reservations`

Behavior:

- authenticate using `x-maintenance-token`
- run the expiration release use case
- return:
  - `releasedOrders`
  - `releasedTickets`
  - execution timestamp

This route is for automation only and should not appear in public UI flows.

## Data Model Impact

No schema redesign is required.

Existing order fields are sufficient:

- `emailDeliveryStatus`
- `emailSentAt`

Existing ticket and order cleanup logic can be reused from the worker processor and order expiration flow.

## Error Handling

### Email send failure

- order remains `paid`
- tickets remain assigned
- `emailDeliveryStatus` becomes `failed`
- error is logged

### Maintenance job failure

- GitHub Action run fails
- next scheduled run retries naturally
- cleanup endpoint must not partially corrupt orders or tickets

### Duplicate webhook

Current idempotency must remain intact.

If a duplicate approved webhook arrives:

- do not send the paid email twice
- keep current idempotent payment behavior

## Testing Requirements

Add coverage for:

1. `NOTIFICATIONS_MODE=inline` sends paid-order email directly from API
2. inline email failure marks `emailDeliveryStatus=failed` without reverting payment state
3. `NOTIFICATIONS_MODE=queue` preserves current enqueue behavior
4. maintenance endpoint rejects missing/invalid secret
5. maintenance endpoint expires orders and releases reserved tickets
6. duplicate approved webhook does not send duplicate email

## Deployment Plan

### Free launch

- `web` on Vercel
- `api` on Vercel with `NOTIFICATIONS_MODE=inline`
- GitHub Actions scheduled workflow for cleanup
- no worker deployment

### Future paid upgrade

- deploy `apps/worker`
- switch `NOTIFICATIONS_MODE=queue`
- optionally disable GitHub cleanup workflow

This preserves operational continuity without changing the public purchase flow.

## Out of Scope

- migrating to Vercel Queues or Workflow now
- replacing Redis entirely
- adding winner-announcement emails
- redesigning email templates
- removing BullMQ codepaths completely

## Success Criteria

The design is successful when:

- a paid order on Vercel sends its confirmation email without any worker process
- expired reservations are released automatically by a free scheduler
- production can later return to `queue + worker` by configuration instead of a rewrite
