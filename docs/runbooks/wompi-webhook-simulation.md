# Runbook - Simulacion Webhook Wompi

Fecha: 2026-02-19

Este flujo sirve para validar idempotencia y confirmacion por webhook sin exponer credenciales reales.

## 1) Crear orden y checkout

Usa la landing o el endpoint:

```bash
curl -X POST http://localhost:4000/v1/public/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName": "Tester Local",
    "email": "tester@example.com",
    "phone": "3000000000",
    "ticketQty": 10
  }'
```

Luego crea checkout para obtener `reference`:

```bash
curl -X POST http://localhost:4000/v1/public/payments/wompi/checkout \
  -H 'Content-Type: application/json' \
  -d '{
    "orderId": "<ORDER_ID>",
    "returnUrl": "http://localhost:4321/gracias"
  }'
```

## 2) Simular webhook aprobado

```bash
curl -X POST http://localhost:4000/v1/public/payments/wompi/webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "transaction.updated",
    "data": {
      "transaction": {
        "id": "tx_local_001",
        "reference": "<REFERENCE>",
        "status": "APPROVED",
        "amount_in_cents": 200000,
        "currency": "COP",
        "payment_method_type": "PSE",
        "customer_email": "tester@example.com"
      }
    },
    "signature": {
      "checksum": "dummy"
    },
    "sent_at": "2026-02-19T20:00:00.000Z"
  }'
```

Con `WOMPI_EVENTS_SECRET=events_placeholder`, la validacion de checksum se omite para desarrollo.

## 3) Repetir mismo webhook (idempotencia)

Reenvia exactamente el mismo payload. La API debe responder `idempotent: true`.

## 4) Verificar estado publico de la orden

```bash
curl http://localhost:4000/v1/public/orders/<ORDER_ID>
```

Si el webhook aprobado fue procesado, la orden debe estar en `paid` con `ticketNumbers` asignados.
