# Runbook - Deploy del Worker en Render

Fecha: 2026-04-01

## Objetivo

Levantar `apps/worker` como un `Background Worker` continuo en Render para consumir colas BullMQ de produccion.

## Archivo fuente

- Blueprint: `render.yaml`
- Servicio esperado en Render: `rifaria-worker`

## Por que Render y no Vercel

- El worker de Rifaria no es un endpoint HTTP corto.
- Mantiene un proceso NestJS vivo escuchando colas BullMQ.
- Agenda limpieza de reservas expiradas cada minuto.
- Vercel sirve bien para `web` y `api`, pero este proceso necesita un runtime persistente.

## Variables necesarias en Render

Estas variables se cargan en el flujo inicial del Blueprint porque en `render.yaml` estan con `sync: false`:

- `MONGODB_URI`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`
- `RESEND_API_KEY`

Variables definidas en el Blueprint:

- `NODE_ENV=production`
- `EMAIL_PROVIDER=resend`

## Despliegue inicial

1. En Render, crea un nuevo `Blueprint` desde este repo.
2. Usa el archivo `render.yaml` del root del repositorio.
3. Cuando Render pida secretos, carga los valores productivos del worker.
4. Completa la creacion del servicio `rifaria-worker`.

## Comandos del servicio

- Build: `pnpm install --frozen-lockfile && pnpm --filter @rifaria/worker build`
- Start: `pnpm --filter @rifaria/worker start`

## Verificacion despues del deploy

Confirma en logs:

- `Rifaria worker started and listening for jobs`
- `Scheduled periodic job for expired reservation cleanup`

Haz un smoke funcional:

1. Crea una compra pagada de prueba.
2. Confirma que la API marque la orden `paid`.
3. Confirma que el worker procese la cola de notificaciones.
4. Confirma que el correo salga con las boletas asignadas.

## Mantenimiento

- `sync: false` solo pide secretos en la creacion inicial del Blueprint.
- Si luego cambias `EMAIL_FROM`, `EMAIL_REPLY_TO`, `RESEND_API_KEY` o Redis, actualizalos manualmente en el dashboard de Render.
- Si en el futuro cambias de `resend` a `postmark`, actualiza `render.yaml` y agrega las variables nuevas directamente en Render.

## Rollback minimo

Si un deploy del worker falla:

1. Abre el servicio `rifaria-worker` en Render.
2. Usa `Rollback` al ultimo deploy sano.
3. Verifica que vuelvan a aparecer logs de escucha de colas.
