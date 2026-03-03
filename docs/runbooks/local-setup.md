# Runbook - Local Setup

Fecha: 2026-02-19

## 1. Dependencias

- Node 24+
- pnpm 10+
- MongoDB en `mongodb://localhost:27017/rifaria`
- Redis en `127.0.0.1:6379`

## 2. Variables de entorno

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env
```

## 3. Instalacion y arranque

```bash
pnpm install
pnpm infra:up
pnpm dev
```

Servicios esperados:

- Web: `http://localhost:4321`
- API: `http://localhost:4000/v1`
- Worker: proceso de consola en segundo plano (cola)

Checks rapidos de salud:

```bash
curl http://localhost:4000/v1/health
curl http://localhost:4000/v1/health/ready
```

## 4. Bootstrap admin

```bash
pnpm --filter @rifaria/api seed
```

Alternativa por API:

```bash
curl -X POST http://localhost:4000/v1/auth/bootstrap-admin \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName":"Admin Rifaria",
    "email":"admin@rifaria.local",
    "password":"ChangeThis123!",
    "role":"owner"
  }'
```

## 5. Prueba de compra (sin credenciales reales)

1. Abrir landing.
2. Crear orden desde widget.
3. Verificar respuesta de checkout con URL Wompi generada.
4. Simular webhook `APPROVED` con referencia valida para confirmar asignacion.
5. Consultar estado publico de orden:

```bash
curl http://localhost:4000/v1/public/orders/<ORDER_ID>
```
