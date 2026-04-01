# Multi-Prize Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Rifaria from a single-prize raffle into a multi-prize campaign with public draw history, richer admin operations, and post-payment email observability without sending any email for unpaid orders.

**Architecture:** Keep `Raffle` as the campaign shell, add a dedicated `PrizeDraw` child collection, and extend `Ticket` plus `Order` with prize/email state. Expose the enriched campaign shape through the public API, extend admin endpoints for operations and inventory, and then wire the Astro frontend to the new model while preserving the paid-only notification trigger.

**Tech Stack:** NestJS, Mongoose, BullMQ, Astro, React, TypeScript, Jest, Vitest, Node test runner

---

### Task 1: Add campaign prize-draw domain and contracts

**Files:**
- Create: `apps/api/src/modules/prize-draws/schemas/prize-draw.schema.ts`
- Create: `apps/api/src/modules/prize-draws/dto/create-prize-draw.dto.ts`
- Create: `apps/api/src/modules/prize-draws/dto/update-prize-draw.dto.ts`
- Create: `apps/api/src/modules/prize-draws/dto/reorder-prize-draws.dto.ts`
- Create: `apps/api/src/modules/prize-draws/prize-draws.module.ts`
- Create: `apps/api/src/modules/prize-draws/prize-draws.service.ts`
- Modify: `apps/api/src/modules/raffles/schemas/raffle.schema.ts`
- Modify: `apps/api/src/modules/tickets/schemas/ticket.schema.ts`
- Modify: `apps/api/src/modules/orders/schemas/order.schema.ts`
- Modify: `packages/shared/src/contracts/public.ts`
- Modify: `packages/shared/src/contracts/public.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the failing shared contract tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  createPrizeDrawSchema,
  reorderPrizeDrawsSchema,
  settlePrizeDrawSchema
} from './public.js';

describe('multi-prize public contracts', () => {
  it('accepts a scheduled prize draw payload', () => {
    const parsed = createPrizeDrawSchema.parse({
      title: 'Bono de apertura',
      description: 'Premio de efectivo para el primer corte',
      prizeType: 'cash',
      displayValue: '$10.000.000',
      imageUrl: 'https://example.com/premio.jpg',
      drawAt: '2026-05-01T00:00:00.000Z',
      drawSource: 'Loteria de Medellin'
    });

    expect(parsed.prizeType).toBe('cash');
  });

  it('rejects invalid winning numbers when settling a draw', () => {
    expect(() =>
      settlePrizeDrawSchema.parse({
        winningNumber: '12',
        drawResultSourceUrl: 'https://example.com/resultados'
      })
    ).toThrow();
  });

  it('requires at least one prize draw id for reorder', () => {
    expect(() => reorderPrizeDrawsSchema.parse({ orderedIds: [] })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @rifaria/shared test`
Expected: FAIL because `createPrizeDrawSchema`, `settlePrizeDrawSchema`, and `reorderPrizeDrawsSchema` do not exist yet.

- [ ] **Step 3: Write minimal shared/domain implementation**

```ts
export const prizeDrawTypes = ['cash', 'vehicle', 'property', 'bundle', 'other'] as const;
export const prizeDrawStatuses = ['scheduled', 'drawn', 'cancelled'] as const;

export const createPrizeDrawSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(1200),
  prizeType: z.enum(prizeDrawTypes),
  displayValue: z.string().trim().min(2).max(140),
  imageUrl: z.string().trim().url(),
  drawAt: z.coerce.date(),
  drawSource: z.string().trim().min(3).max(200),
  isMajorPrize: z.boolean().default(false)
});

export const settlePrizeDrawSchema = z.object({
  winningNumber: z.string().regex(/^\d{4}$/),
  drawResultSourceUrl: z.string().trim().url()
});

export const reorderPrizeDrawsSchema = z.object({
  orderedIds: z.array(z.string().min(10)).min(1)
});
```

```ts
@Schema({ timestamps: true })
export class PrizeDraw {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Raffle', index: true })
  raffleId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ type: String, enum: prizeDrawTypes, required: true })
  prizeType!: PrizeDrawType;

  @Prop({ required: true, trim: true })
  displayValue!: string;

  @Prop({ required: true, trim: true })
  imageUrl!: string;

  @Prop({ required: true, min: 0 })
  position!: number;

  @Prop({ required: true })
  drawAt!: Date;

  @Prop({ required: true, trim: true })
  drawSource!: string;

  @Prop({ type: String, enum: prizeDrawStatuses, default: 'scheduled' })
  status!: PrizeDrawStatus;
}
```

```ts
@Prop({ type: Types.ObjectId, ref: 'PrizeDraw', default: null, index: true })
wonPrizeDrawId!: Types.ObjectId | null;

@Prop({ type: Date, default: null })
wonAt!: Date | null;
```

```ts
@Prop({ type: Date, default: null })
emailSentAt!: Date | null;

@Prop({ type: String, enum: ['queued', 'sent', 'failed'], default: null })
emailDeliveryStatus!: 'queued' | 'sent' | 'failed' | null;
```

- [ ] **Step 4: Run tests to verify the domain passes**

Run: `pnpm --filter @rifaria/shared test`
Expected: PASS with the new multi-prize schema coverage included.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/contracts/public.ts packages/shared/src/contracts/public.test.ts packages/shared/src/index.ts apps/api/src/modules/prize-draws apps/api/src/modules/raffles/schemas/raffle.schema.ts apps/api/src/modules/tickets/schemas/ticket.schema.ts apps/api/src/modules/orders/schemas/order.schema.ts
git commit -m "feat: add multi-prize campaign domain"
```

### Task 2: Implement API support for prize calendar, settlement, buyers, and inventory

**Files:**
- Modify: `apps/api/src/modules/raffles/raffles.module.ts`
- Modify: `apps/api/src/modules/raffles/raffles.service.ts`
- Modify: `apps/api/src/modules/raffles/raffles.controller.ts`
- Modify: `apps/api/src/modules/draws/draws.module.ts`
- Modify: `apps/api/src/modules/draws/draws.service.ts`
- Modify: `apps/api/src/modules/draws/dto/settle-draw.dto.ts`
- Modify: `apps/api/src/modules/admin/admin.module.ts`
- Modify: `apps/api/src/modules/admin/admin.service.ts`
- Modify: `apps/api/src/modules/admin/admin.controller.ts`
- Modify: `apps/api/src/modules/orders/orders.service.ts`
- Modify: `apps/api/src/modules/orders/orders.service.spec.ts`
- Modify: `apps/api/src/modules/tickets/tickets.service.ts`
- Modify: `apps/api/src/modules/payments-wompi/payments-wompi.service.ts`
- Modify: `apps/api/src/modules/payments-wompi/payments-wompi.service.spec.ts`

- [ ] **Step 1: Write the failing API tests for settlement and payment behavior**

```ts
it('settles a prize draw and snapshots the winning buyer when a paid ticket matches', async () => {
  ticketModel.findOne.mockResolvedValue({
    _id: new Types.ObjectId(),
    orderId,
    number4d: '1234'
  });

  const result = await service.settlePrizeDraw(prizeDrawId, {
    winningNumber: '1234',
    drawResultSourceUrl: 'https://example.com/resultados'
  });

  expect(result.winner?.orderId).toBe(String(orderId));
  expect(ticketModel.updateOne).toHaveBeenCalledWith(
    expect.objectContaining({ _id: expect.anything() }),
    expect.objectContaining({ $set: expect.objectContaining({ wonPrizeDrawId: expect.anything() }) })
  );
});

it('records a public winning number without winner when no assigned ticket matches', async () => {
  ticketModel.findOne.mockResolvedValue(null);

  const result = await service.settlePrizeDraw(prizeDrawId, {
    winningNumber: '9999',
    drawResultSourceUrl: 'https://example.com/resultados'
  });

  expect(result.winner).toBeNull();
  expect(result.prizeDraw.winningNumber).toBe('9999');
});

it('marks email delivery as queued only after payment approval', async () => {
  notificationsService.enqueueTicketEmail.mockResolvedValue(undefined);

  await service.handleWebhook(approvedWebhook);

  expect(ordersService.markEmailQueued).toHaveBeenCalledWith(expect.anything());
});
```

- [ ] **Step 2: Run targeted API tests and confirm failure**

Run: `pnpm --filter @rifaria/api test -- orders.service.spec.ts payments-wompi.service.spec.ts`
Expected: FAIL because prize-draw settlement logic and email-delivery state do not exist yet.

- [ ] **Step 3: Implement the API surface**

```ts
async getActivePublicCampaign() {
  const raffle = await this.getActiveRaffleForSales();
  const prizeDraws = await this.prizeDrawsService.ensureAndListForRaffle(raffle._id);

  return {
    ...serializeRaffle(raffle),
    featuredPrize: prizeDraws.find((draw) => draw.isMajorPrize) ?? prizeDraws[0] ?? null,
    upcomingPrizeDraws: prizeDraws.filter((draw) => draw.status === 'scheduled'),
    completedPrizeDraws: prizeDraws.filter((draw) => draw.status === 'drawn')
  };
}
```

```ts
async settlePrizeDraw(prizeDrawId: string, dto: SettlePrizeDrawDto) {
  const prizeDraw = await this.findByIdOrThrow(prizeDrawId);
  if (prizeDraw.status === 'drawn') {
    return serializeSettledPrizeDraw(prizeDraw);
  }

  const winnerTicket = await this.ticketsService.findEligibleWinnerTicket(
    prizeDraw.raffleId,
    dto.winningNumber
  );

  if (winnerTicket) {
    await this.ticketsService.markTicketAsWinner(winnerTicket._id, prizeDraw._id);
  }

  return this.prizeDrawModel.findByIdAndUpdate(
    prizeDraw._id,
    {
      $set: {
        status: 'drawn',
        winningNumber: dto.winningNumber,
        drawResultSourceUrl: dto.drawResultSourceUrl,
        winningTicketId: winnerTicket?._id ?? null,
        winnerOrderId: winnerTicket?.orderId ?? null,
        settledAt: new Date()
      }
    },
    { new: true }
  );
}
```

```ts
@Get('prize-draws')
prizeDraws() {
  return this.adminService.listPrizeDraws();
}

@Post('prize-draws')
createPrizeDraw(@Body() dto: CreatePrizeDrawDto) {
  return this.adminService.createPrizeDraw(dto);
}

@Post('prize-draws/:id/settle')
settlePrizeDraw(@Param('id') id: string, @Body() dto: SettlePrizeDrawDto) {
  return this.adminService.settlePrizeDraw(id, dto);
}

@Get('tickets')
tickets(@Query() query: AdminTicketQueryDto) {
  return this.adminService.listTicketInventory(query);
}
```

- [ ] **Step 4: Run API verification**

Run: `pnpm --filter @rifaria/api test`
Expected: PASS including settlement, idempotency, and payment-email-state coverage.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/raffles apps/api/src/modules/draws apps/api/src/modules/admin apps/api/src/modules/orders apps/api/src/modules/tickets apps/api/src/modules/payments-wompi
git commit -m "feat: add multi-prize campaign api"
```

### Task 3: Track paid-email delivery state in the worker and enrich the email template

**Files:**
- Modify: `apps/worker/src/schemas/order.schema.ts`
- Modify: `apps/worker/src/schemas/raffle.schema.ts`
- Create: `apps/worker/src/schemas/prize-draw.schema.ts`
- Modify: `apps/worker/src/app.module.ts`
- Modify: `apps/worker/src/processors/notifications.processor.ts`
- Modify: `apps/worker/src/services/email-templates.ts`

- [ ] **Step 1: Write the failing worker-facing assertions in API or template tests**

```ts
it('renders the paid tickets and next upcoming prize draws in the email html', () => {
  const html = ticketEmailTemplate({
    fullName: 'Laura',
    raffleTitle: 'Rifaria Abril',
    rafflePrize: 'Premio mayor',
    drawAt: new Date('2026-06-01T00:00:00.000Z'),
    drawSource: 'Loteria de Medellin',
    ticketNumbers: ['1001', '2030'],
    upcomingPrizeDraws: [
      { title: 'Bono en efectivo', drawAt: new Date('2026-04-10T00:00:00.000Z') }
    ]
  });

  expect(html).toContain('1001');
  expect(html).toContain('Bono en efectivo');
});
```

- [ ] **Step 2: Run the relevant test command and confirm failure**

Run: `pnpm --filter @rifaria/api test -- payments-wompi.service.spec.ts`
Expected: FAIL because the worker template payload and order delivery state are not updated.

- [ ] **Step 3: Implement delivery-state handling without changing the email trigger**

```ts
await this.ordersService.markEmailQueued(orderId);

await this.emailService.send({
  to: order.email,
  subject: `Tus boletas de Rifaria - ${raffle.title}`,
  html
});

await this.orderModel.updateOne(
  { _id: order._id },
  {
    $set: {
      emailDeliveryStatus: 'sent',
      emailSentAt: new Date()
    }
  }
);
```

```ts
catch (error) {
  await this.orderModel.updateOne(
    { _id: order._id },
    { $set: { emailDeliveryStatus: 'failed' } }
  );
  throw error;
}
```

- [ ] **Step 4: Re-run API and worker-adjacent verification**

Run: `pnpm --filter @rifaria/api test`
Expected: PASS with the paid-only email path still intact and observable.

- [ ] **Step 5: Commit**

```bash
git add apps/worker/src apps/api/src/modules/orders apps/api/src/modules/payments-wompi
git commit -m "feat: track paid order email delivery"
```

### Task 4: Update the public site and order status flow for multi-prize campaigns

**Files:**
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/pages/index.astro`
- Modify: `apps/web/src/components/PurchaseWidget.tsx`
- Modify: `apps/web/src/components/OrderStatusCard.tsx`
- Modify: `apps/web/src/pages/gracias.astro`
- Modify: `apps/web/src/styles/global.css`
- Modify: `apps/web/tests/public-pages.test.mjs`

- [ ] **Step 1: Write the failing public smoke assertions**

```js
test('home exposes upcoming prize calendar and completed winning numbers', async () => {
  const html = await readBuiltPage('index.html');
  assert.match(html, /Calendario de premios/i);
  assert.match(html, /Numeros ganadores/i);
});

test('thanks page includes upcoming eligible draws for paid orders', async () => {
  const html = await readBuiltPage('gracias/index.html');
  assert.match(html, /Premios que sigues jugando/i);
});
```

- [ ] **Step 2: Run the web smoke test and confirm failure**

Run: `pnpm --filter @rifaria/web build && pnpm --filter @rifaria/web test`
Expected: FAIL because the current landing and thanks page do not render the new sections.

- [ ] **Step 3: Implement the public campaign UI**

```ts
export interface PublicPrizeDraw {
  id: string;
  title: string;
  status: 'scheduled' | 'drawn' | 'cancelled';
  displayValue: string;
  drawAt: string;
  drawSource: string;
  winningNumber: string | null;
  winnerLabel: string | null;
  proofUrl: string | null;
}
```

```astro
<section class="section-shell container" id="calendario">
  <div class="section-heading">
    <p class="section-kicker">Calendario visible</p>
    <h2 class="brand-title section-title">Premios por fecha</h2>
  </div>

  <div class="timeline-grid">
    {raffle.upcomingPrizeDraws.map((draw) => (
      <article class="timeline-card glass-card">
        <span class="prize-chip">{draw.displayValue}</span>
        <h3 class="brand-title">{draw.title}</h3>
        <p>{formatDate(draw.drawAt)}</p>
      </article>
    ))}
  </div>
</section>
```

```tsx
{status?.upcomingPrizeDraws?.length ? (
  <div className="status-schedule">
    <p>Premios que sigues jugando:</p>
    {status.upcomingPrizeDraws.map((draw) => (
      <div key={draw.id} className="admin-row">
        {draw.title} · {formatDate(draw.drawAt)}
      </div>
    ))}
  </div>
) : null}
```

- [ ] **Step 4: Run web verification**

Run: `pnpm --filter @rifaria/web build && pnpm --filter @rifaria/web lint && pnpm --filter @rifaria/web test`
Expected: PASS with the new calendar and public results board rendered in desktop/mobile markup.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/pages/index.astro apps/web/src/components/PurchaseWidget.tsx apps/web/src/components/OrderStatusCard.tsx apps/web/src/pages/gracias.astro apps/web/src/styles/global.css apps/web/tests/public-pages.test.mjs
git commit -m "feat: publish multi-prize campaign ui"
```

### Task 5: Expand the admin UI for prize operations, ticket inventory, and buyers

**Files:**
- Modify: `apps/web/src/components/AdminPanel.tsx`
- Modify: `apps/web/src/pages/admin.astro`
- Modify: `apps/web/src/styles/global.css`
- Modify: `apps/web/tests/public-pages.test.mjs`

- [ ] **Step 1: Add the failing admin smoke assertion**

```js
test('admin page renders prize management, buyers, and inventory sections', async () => {
  const html = await readBuiltPage('admin/index.html');
  assert.match(html, /Gestion de premios/i);
  assert.match(html, /Inventario de boletas/i);
  assert.match(html, /Compradores recientes/i);
});
```

- [ ] **Step 2: Run the web smoke test and confirm failure**

Run: `pnpm --filter @rifaria/web build && pnpm --filter @rifaria/web test`
Expected: FAIL because the current admin only shows a compact summary and login.

- [ ] **Step 3: Build the richer admin console**

```tsx
const [dashboard, prizeDraws, buyers, tickets] = await Promise.all([
  fetchWithToken('/admin/dashboard'),
  fetchWithToken('/admin/prize-draws'),
  fetchWithToken('/admin/buyers'),
  fetchWithToken('/admin/tickets?limit=40')
]);
```

```tsx
<section className="admin-section glass-card">
  <div className="section-heading">
    <p className="section-kicker">Gestion de premios</p>
    <h3 className="brand-title">Calendario operativo</h3>
  </div>
  {data.prizeDraws.map((draw) => (
    <article key={draw.id} className="admin-ticket-row">
      <strong>{draw.title}</strong>
      <span>{draw.status}</span>
      <span>{draw.winningNumber ?? 'pendiente'}</span>
    </article>
  ))}
</section>
```

- [ ] **Step 4: Run end-to-end frontend verification**

Run: `pnpm --filter @rifaria/web build && pnpm --filter @rifaria/web lint && pnpm --filter @rifaria/web test`
Expected: PASS with the admin markup exposing operations, buyers, and ticket search state.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/AdminPanel.tsx apps/web/src/pages/admin.astro apps/web/src/styles/global.css apps/web/tests/public-pages.test.mjs
git commit -m "feat: expand admin campaign console"
```

### Task 6: Final integrated verification and branch wrap-up

**Files:**
- Modify: `docs/superpowers/plans/2026-04-01-multi-prize-campaign-implementation.md`

- [ ] **Step 1: Run the integrated verification suite**

Run: `pnpm --filter @rifaria/shared build && pnpm -r test && pnpm -r --if-present lint`
Expected: PASS across shared, api, web, and worker lint targets.

- [ ] **Step 2: Run one manual build pass for the public web**

Run: `pnpm --filter @rifaria/web build`
Expected: PASS and updated static output with home, thanks, legal, and admin pages.

- [ ] **Step 3: Update the plan checkboxes and note any intentional follow-up**

```md
- [x] Task 1 completed
- [x] Task 2 completed
- [x] Task 3 completed
- [x] Task 4 completed
- [x] Task 5 completed
```

- [ ] **Step 4: Commit the finished verification state**

```bash
git add docs/superpowers/plans/2026-04-01-multi-prize-campaign-implementation.md
git commit -m "chore: record multi-prize campaign verification"
```
