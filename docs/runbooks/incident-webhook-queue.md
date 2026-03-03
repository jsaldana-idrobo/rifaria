# Runbook - Incidente de Webhook/Cola

Fecha: 2026-02-20

## 1) Sintomas comunes

- Pagos aprobados en pasarela, pero orden sigue en `pending_payment`.
- Orden en `paid` sin correo enviado.
- Tickets reservados sin liberacion despues de vencimiento.
- Incremento de errores 5xx en `POST /v1/public/payments/wompi/webhook`.

## 2) Verificacion inicial (5 minutos)

```bash
curl -s http://localhost:4000/v1/health/ready | jq
```

Validar que `checks.mongodb=up` y `checks.redis=up`.

## 3) Revisar trazas por `x-request-id`

En API, cada request expone header `x-request-id`. Usa ese valor para rastrear logs.

Campos clave en logs HTTP:

- `requestId`
- `method`
- `path`
- `statusCode`
- `durationMs`

## 4) Diagnostico por tipo

### A) Webhook rechazado por firma

- Confirmar `WOMPI_EVENTS_SECRET` correcto.
- En local, usar `events_placeholder` para omitir validacion.
- Revisar body exacto recibido vs body firmado.

### B) Cola de notificaciones no procesa

- Confirmar proceso worker activo.
- Revisar logs del worker: eventos `Notification job failed` o `Ticket job failed`.
- Verificar Redis accesible y sin password incorrecto.

### C) Orden aprobada sin boletas visibles

- Reenviar webhook original: el flujo es idempotente y reconcilia estado.
- Consultar `GET /v1/public/orders/:id` para validar `status` y `ticketNumbers`.

## 5) Acciones de mitigacion

1. Reiniciar API y worker.
2. Reenviar webhook de transacciones pendientes.
3. Confirmar que `soldTickets` coincide con tickets `assigned` por rifa.
4. Ejecutar verificacion manual de ordenes `pending_payment` expiradas.

## 6) Criterio de cierre

- Sin ordenes atascadas en `pending_payment` fuera de TTL.
- Sin jobs fallidos crecientes en cola.
- Webhook responde 2xx consistentemente.
- Emails de confirmacion enviados para pagos `approved`.
