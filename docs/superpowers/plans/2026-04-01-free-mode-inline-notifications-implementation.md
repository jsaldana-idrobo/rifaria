# Free Mode Inline Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Rifaria work in a free deployment mode by sending post-payment emails directly from the API and releasing expired reservations from a scheduled secure endpoint.

**Architecture:** The API gains a runtime notification mode switch: `inline` sends emails directly through provider services, while `queue` preserves the existing BullMQ path for a future paid worker deployment. Expired reservation cleanup moves behind a protected internal endpoint, and GitHub Actions calls that endpoint every 5 minutes in free mode.

**Tech Stack:** NestJS, Mongoose, BullMQ, Jest, GitHub Actions, Vercel environment variables, Resend/Postmark via `fetch`

---

### Task 1: Add API runtime configuration for free mode

**Files:**
- Modify: `apps/api/src/config/env.ts`
- Modify: `apps/api/src/config/env.spec.ts`
- Test: `apps/api/src/config/env.spec.ts`

- [ ] **Step 1: Write the failing env tests**
- [ ] **Step 2: Run env tests to verify they fail**
- [ ] **Step 3: Add `NOTIFICATIONS_MODE`, provider credentials, and `MAINTENANCE_TOKEN` validation**
- [ ] **Step 4: Re-run env tests to verify they pass**

### Task 2: Add inline notification delivery services to the API

**Files:**
- Create: `apps/api/src/modules/notifications/email.service.ts`
- Create: `apps/api/src/modules/notifications/email-templates.ts`
- Modify: `apps/api/src/modules/notifications/notifications.module.ts`
- Modify: `apps/api/src/modules/notifications/notifications.service.ts`
- Modify: `apps/api/src/modules/orders/orders.service.ts`
- Modify: `apps/api/src/modules/payments-wompi/payments-wompi.service.ts`
- Modify: `apps/api/src/modules/draws/draws.service.ts`
- Modify: `apps/api/src/modules/payments-wompi/payments-wompi.service.spec.ts`
- Create: `apps/api/src/modules/notifications/notifications.service.spec.ts`
- Test: `apps/api/src/modules/notifications/notifications.service.spec.ts`
- Test: `apps/api/src/modules/payments-wompi/payments-wompi.service.spec.ts`

- [ ] **Step 1: Write failing tests for inline send, queue compatibility, and duplicate approval behavior**
- [ ] **Step 2: Run notification/payment tests to verify they fail**
- [ ] **Step 3: Implement inline email provider + template reuse in API**
- [ ] **Step 4: Update payment/draw flows to call semantic notification methods**
- [ ] **Step 5: Re-run notification/payment tests to verify they pass**

### Task 3: Add secure maintenance endpoint for expired reservations

**Files:**
- Create: `apps/api/src/modules/maintenance/maintenance.controller.ts`
- Create: `apps/api/src/modules/maintenance/maintenance.module.ts`
- Create: `apps/api/src/modules/maintenance/maintenance.service.ts`
- Create: `apps/api/src/modules/maintenance/maintenance.controller.spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/modules/orders/orders.service.ts`
- Test: `apps/api/src/modules/maintenance/maintenance.controller.spec.ts`

- [ ] **Step 1: Write failing tests for secret enforcement and cleanup summary**
- [ ] **Step 2: Run maintenance tests to verify they fail**
- [ ] **Step 3: Implement protected maintenance endpoint and cleanup service**
- [ ] **Step 4: Re-run maintenance tests to verify they pass**

### Task 4: Add free scheduler workflow and docs

**Files:**
- Create: `.github/workflows/release-expired-reservations.yml`
- Modify: `README.md`
- Modify: `docs/runbooks/go-live-checklist.md`
- Modify: `docs/runbooks/production-env-secrets.md`

- [ ] **Step 1: Add GitHub Actions scheduled workflow hitting the maintenance endpoint**
- [ ] **Step 2: Document required GitHub secret and Vercel env changes**
- [ ] **Step 3: Verify workflow YAML parses and docs are coherent**

### Task 5: Final verification

**Files:**
- Modify as needed from earlier tasks

- [ ] **Step 1: Run targeted API tests**
- [ ] **Step 2: Run `pnpm --filter @rifaria/api build`**
- [ ] **Step 3: Run `pnpm --filter @rifaria/api lint`**
- [ ] **Step 4: Run `pnpm --filter @rifaria/web lint`**
- [ ] **Step 5: Review `git diff --stat` and summarize deployment follow-ups**
