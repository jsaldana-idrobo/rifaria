# Rifaria - Plan de Implementación (MVP)

Fecha: 2026-02-19  
Basado en: `docs/plans/2026-02-19-rifaria-design.md` (validado)

## 1) Alcance cerrado del MVP

- Pasarela inicial: `Wompi`.
- Boletas únicas por rifa (`0000` a `9999`).
- Compra mínima: `10` boletas.
- Una sola rifa activa simultáneamente.
- Ganador por resultado oficial de lotería/sorteo en Colombia.
- Sin devolución por aplazamiento; devolución solo por duplicados/errores conciliados.

## 2) Arquitectura de implementación

- `apps/web`: Astro + React (landing pública + checkout UX).
- `apps/api`: NestJS + MongoDB (dominio, pagos, webhooks, admin API).
- `apps/worker`: procesos de cola (emails, expiración reservas, conciliación, notificaciones).
- `packages/shared`: tipos, DTOs compartidos, utilidades.

## 3) Orden de ejecución (sprints)

### Sprint 0 - Base técnica (2 días)

- Inicializar monorepo (`pnpm workspaces`).
- Crear apps `web`, `api`, `worker`.
- Configurar `ESLint`, `Prettier`, `commitlint`, `husky`, `.editorconfig`.
- Variables de entorno por app (`.env.example`).
- Pipeline CI básica (lint + test).

Criterio de salida:

- Proyecto corre local con `pnpm dev`.
- CI ejecuta sin errores en PR.

### Sprint 1 - Dominio core y compra (4 días)

- Modelos Mongo: `raffles`, `tickets`, `orders`, `payments`, `users`, `audit_logs`.
- Índice único `tickets(raffleId, number4d)`.
- Endpoint `GET /v1/public/raffle/active`.
- Endpoint `POST /v1/public/orders`.
- Reserva aleatoria de boletas con TTL (job de liberación por expiración).
- Máquina de estados de orden/ticket.

Criterio de salida:

- Se puede crear orden válida con boletas reservadas sin duplicados.

### Sprint 2 - Wompi + webhook + confirmación (4 días)

- Integrar creación de checkout Wompi.
- Endpoint webhook con verificación de firma.
- Idempotencia por `providerTransactionId`.
- Al aprobar: `order=paid`, `ticket=assigned`.
- Al fallar/expirar: liberar boletas.
- Ledger/auditoría de eventos de pago.

Criterio de salida:

- Flujo E2E de compra confirmado vía webhook.

### Sprint 3 - Email y experiencia pública (3 días)

- Plantilla de correo “boletas compradas” (HTML responsive).
- Envío asíncrono con cola y reintentos.
- Landing pública final (hero, progreso, CTA fijo, formulario compra).
- SEO base: sitemap, metadata, OG, robots, canonical, JSON-LD.

Criterio de salida:

- Usuario recibe correo con números asignados tras pago aprobado.
- Lighthouse SEO/Performance en verde razonable para MVP.

### Sprint 4 - Panel admin MVP (4 días)

- Auth admin (JWT + refresh).
- Dashboard: ventas, % avance, tickets restantes.
- Módulos: órdenes, pagos, usuarios.
- Configuración de rifa: premio, fechas, lotería oficial, estado.
- Acción de aplazamiento (`postponed`) con notificación a participantes.

Criterio de salida:

- Operación diaria posible desde panel sin scripts manuales.

### Sprint 5 - Calidad y salida a producción (3 días)

- Tests unitarios (reglas de negocio) + integración (orden/pago/ticket) + e2e.
- Observabilidad: logs estructurados, métricas críticas, alertas mínimas.
- Runbook de incidentes (webhook caído, cola caída, desfase pagos-boletas).
- Checklist legal/comercial previo a go-live.

Criterio de salida:

- Deploy productivo controlado con monitoreo y rollback definido.

## 4) Backlog técnico por módulos

### `raffles`

- Estados: `draft`, `published`, `selling`, `postponed`, `drawn`, `closed`.
- Regla de una sola rifa activa.

### `tickets`

- Generación aleatoria 4 cifras con colisión controlada por índice único.
- Estados: `reserved`, `assigned`, `void`.

### `orders`

- Mínimo 10 boletas.
- Total = `ticketQty * 2000`.
- Estados: `initiated`, `pending_payment`, `paid`, `failed`, `expired`, `refunded`.

### `payments-wompi`

- Crear intento de pago.
- Webhook firmado e idempotente.
- Conciliación de duplicados.

### `draws`

- Registro de resultado oficial.
- Cálculo y publicación de ganador.
- Notificación masiva.

### `notifications`

- Email de boletas.
- Email de aplazamiento.
- Reintentos y bitácora.

## 5) Pruebas mínimas obligatorias

- Unit:
- compra menor a 10 rechazada.
- no duplicidad de boleta por rifa.
- transiciones de estado inválidas rechazadas.

- Integración:
- pago aprobado asigna boletas y bloquea reasignación.
- pago fallido libera reservas.
- webhook duplicado no duplica efectos.

- E2E:
- compra completa desde landing hasta correo confirmado.

## 6) Riesgos y mitigación

- Riesgo: sobreventa en alta concurrencia.
- Mitigación: índice único + transacciones + reintentos seguros.

- Riesgo: inconsistencias por webhooks repetidos.
- Mitigación: idempotencia estricta + auditoría.

- Riesgo: caída de correo.
- Mitigación: cola con retry + panel de reenvío.

- Riesgo: ambigüedad legal operativa.
- Mitigación: checklist legal firmado antes de habilitar producción.

## 7) Definition of Done (MVP)

- Flujo de compra estable con Wompi (tarjeta/PSE/Nequi según disponibilidad operativa).
- Boletas únicas y auditables.
- Admin operativo para ventas y configuración.
- SEO técnico base implementado.
- Métricas y alertas activas.
- Políticas públicas visibles alineadas al negocio validado.
