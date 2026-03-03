# Rifaria Monorepo

Proyecto MVP para venta de boletas de rifas en Colombia.

## Stack

- `apps/web`: Astro + React (landing y panel admin UI base)
- `apps/api`: NestJS + MongoDB + BullMQ (core de negocio, pagos, webhooks)
- `apps/worker`: NestJS worker (colas de correo y expiracion de reservas)
- `packages/shared`: reglas de negocio compartidas y contratos

## Requisitos locales

- Node.js 24+
- pnpm 10+
- MongoDB local o remoto
- Redis local o remoto

## Setup rapido

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env
pnpm infra:up
```

Plantillas productivas:

```bash
cp apps/api/.env.production.example apps/api/.env
cp apps/worker/.env.production.example apps/worker/.env
```

## Comandos

```bash
pnpm dev           # web + api + worker en paralelo
pnpm dev:web       # solo Astro
pnpm dev:api       # solo Nest API
pnpm dev:worker    # solo worker
pnpm infra:up      # levanta Mongo + Redis local
pnpm infra:down    # apaga infraestructura local
pnpm infra:logs    # logs de contenedores
pnpm --filter @rifaria/api seed   # seed de rifa y admin local
pnpm build         # build de apps
pnpm test          # tests disponibles
pnpm lint          # type-check/lint por paquete
pnpm format        # formatea el monorepo
pnpm format:check  # valida formato sin escribir cambios
```

## Git hooks y automatizacion

Al correr `pnpm install`, el proyecto intenta configurar hooks de git para:

- `pre-commit`: `pnpm format` y luego `pnpm lint`
- `pre-push`: `pnpm format:check` y luego `pnpm lint`

Si la carpeta no es un repo git, el setup de hooks se omite de forma segura.

## GitHub Actions, Vercel y Sonar

El repo incluye automatizacion para calidad, deploy web y analisis Sonar.

- `CI`: corre `format:check`, `lint`, `test` y `build`
- `deploy-web-preview`: despliega `apps/web` en PRs
- `deploy-web-production`: despliega `apps/web` en `main` o `master`
- `Sonar`: ejecuta analisis en pushes y PRs

Secrets/vars necesarios en GitHub:

```text
VERCEL_TOKEN            # secret
VERCEL_ORG_ID           # secret
VERCEL_WEB_PROJECT_ID   # secret
SONAR_TOKEN             # secret
SONAR_ORGANIZATION      # variable del repo
SONAR_PROJECT_KEY       # variable del repo
```

## Endpoints clave (API)

- `GET /v1/health`
- `GET /v1/health/ready`
- `GET /v1/public/raffle/active`
- `POST /v1/public/orders`
- `GET /v1/public/orders/:id` (estado publico de orden, sin PII)
- `POST /v1/public/payments/wompi/checkout`
- `POST /v1/public/payments/wompi/webhook`
- `POST /v1/auth/bootstrap-admin`
- `POST /v1/auth/login`
- `GET /v1/admin/dashboard`
- `POST /v1/admin/raffles/:id/postpone`
- `POST /v1/admin/draws/:raffleId/settle`

## Notas

- Credenciales reales de Wompi, email providers e infraestructura se dejan para la fase final de configuracion.
- El flujo de compra se confirma solo por webhook.
- En `production`, API y worker validan que no uses placeholders inseguros.
- El worker ya soporta envio real por `resend` y `postmark`.
- API responde `x-request-id` en todas las rutas para trazabilidad de incidentes.
- Guia de variables productivas: `docs/runbooks/production-env-secrets.md`
