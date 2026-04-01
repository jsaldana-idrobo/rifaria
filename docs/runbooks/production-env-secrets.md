# Runbook - Credenciales de Produccion

Fecha: 2026-02-20

## 1) API (`apps/api/.env`)

Base sugerida: `apps/api/.env.production.example`

Variables obligatorias en produccion:

- `NODE_ENV=production`
- `PORT`
- `MONGODB_URI` (no localhost)
- `JWT_ACCESS_SECRET` (fuerte, minimo recomendado 24+ chars)
- `JWT_REFRESH_SECRET` (fuerte, minimo recomendado 24+ chars)
- `WOMPI_ENV=production`
- `WOMPI_PUBLIC_KEY` (real, no test/placeholder)
- `WOMPI_PRIVATE_KEY` (real, no test/placeholder)
- `WOMPI_INTEGRITY_SECRET` (real)
- `WOMPI_EVENTS_SECRET` (real)
- `WEB_BASE_URL` (https)
- `REDIS_HOST` (no localhost)
- `REDIS_PORT`
- `REDIS_PASSWORD` (si aplica)
- `NOTIFICATIONS_MODE` (`inline` para modo gratis, `queue` para worker futuro)
- `MAINTENANCE_TOKEN` (fuerte, para el endpoint interno de cleanup)
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO` (opcional recomendado)

Si `NOTIFICATIONS_MODE=inline` y `EMAIL_PROVIDER=resend`:

- `RESEND_API_KEY` (obligatoria)

Si `NOTIFICATIONS_MODE=inline` y `EMAIL_PROVIDER=postmark`:

- `POSTMARK_SERVER_TOKEN` (obligatoria)
- `POSTMARK_MESSAGE_STREAM` (por defecto `outbound`)

## 2) Worker (`apps/worker/.env`)

Base sugerida: `apps/worker/.env.production.example`

Variables obligatorias en produccion:

- `NODE_ENV=production`
- `MONGODB_URI` (no localhost)
- `REDIS_HOST` (no localhost)
- `REDIS_PORT`
- `REDIS_PASSWORD` (si aplica)
- `EMAIL_PROVIDER` (`resend` o `postmark`, no `console`)
- `EMAIL_FROM`
- `EMAIL_REPLY_TO` (opcional recomendado)

Si `EMAIL_PROVIDER=resend`:

- `RESEND_API_KEY` (obligatoria)

Si `EMAIL_PROVIDER=postmark`:

- `POSTMARK_SERVER_TOKEN` (obligatoria)
- `POSTMARK_MESSAGE_STREAM` (por defecto `outbound`)

## 3) Verificacion rapida

Al iniciar API o worker en `production`, la app falla al boot si detecta placeholders o configuracion insegura.

Comandos:

```bash
pnpm dev:api
pnpm dev:worker
```

o build + start:

```bash
pnpm build
pnpm --filter @rifaria/api start
pnpm --filter @rifaria/worker start
```

## 4) Modo gratis recomendado

- `web`: Vercel
- `api`: Vercel
- `worker`: no desplegado
- `cleanup`: GitHub Actions cada 5 minutos

Variables operativas adicionales:

- secret GitHub: `RIFARIA_MAINTENANCE_TOKEN`
- Vercel API env: `MAINTENANCE_TOKEN`

## 5) Host recomendado para el worker futuro

- `web`: Vercel
- `api`: Vercel
- `worker`: Render `Background Worker`

Motivo:

- el worker necesita un proceso continuo para BullMQ
- procesa correos y expiracion de reservas en segundo plano
- no depende de un request HTTP entrante

Referencia operativa:

- `docs/runbooks/render-worker-deploy.md`
