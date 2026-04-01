# Checklist - Go Live MVP

Fecha: 2026-02-20

## 1) Configuracion tecnica

- [ ] `NODE_ENV=production` en API y worker.
- [ ] `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` reales.
- [ ] `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` rotados.
- [ ] `MONGODB_URI` de produccion con backups y monitoreo.
- [ ] `REDIS_HOST/REDIS_PORT/REDIS_PASSWORD` de produccion.
- [ ] `WEB_BASE_URL` al dominio final.
- [ ] `EMAIL_PROVIDER` real (`resend` o `postmark`) y remitente validado.
- [ ] `RESEND_API_KEY` o `POSTMARK_SERVER_TOKEN` configurados segun proveedor.
- [ ] Worker `rifaria-worker` desplegado y corriendo en Render.

## 2) Operacion y seguridad

- [ ] Solo un admin `owner` inicial validado.
- [ ] Endpoints admin protegidos con JWT y roles.
- [ ] Politicas de terminos y datos publicadas en web.
- [ ] Verificacion de firmas webhook en ambiente productivo.
- [ ] Retencion de logs y monitoreo de errores 4xx/5xx.

## 3) Flujos funcionales obligatorios (smoke)

- [ ] Compra minima de 10 boletas exitosa.
- [ ] Checkout Wompi generado con referencia valida.
- [ ] Webhook `APPROVED` marca orden `paid` y asigna boletas.
- [ ] Webhook duplicado responde idempotente sin duplicar efectos.
- [ ] Webhook `DECLINED` libera reservas.
- [ ] Correo de boletas enviado (o registrado en proveedor).
- [ ] Panel admin muestra dashboard, ordenes y pagos.

## 4) Preparacion legal/comercial

- [ ] Validacion legal local para operacion de rifas en Colombia.
- [ ] Fuente oficial de sorteo definida y publicada.
- [ ] Politica de aplazamiento y reversos aprobada por negocio/legal.
- [ ] Responsable operativo asignado para incidentes de pagos.

## 5) Rollback minimo

- [ ] Procedimiento de rollback documentado (web + api + worker).
- [ ] Contacto de soporte de pasarela y proveedor de email disponible.
- [ ] Runbook de incidente webhook/cola validado por el equipo.
