# Rifaria - Plan de Producto y Arquitectura (MVP + Escalamiento)

Fecha: 2026-02-19  
Estado: Borrador inicial para validación

## 1) Objetivo del producto

Construir una plataforma web para vender boletas de rifas en Colombia con:

- Landing page altamente llamativa y optimizada para conversión.
- Compra mínima de 10 boletas por orden.
- Boletas de 4 cifras a precio fijo de COP 2.000.
- Integración con pasarela que soporte tarjetas, PSE y Nequi.
- Envío de correo con boletas compradas al confirmar el pago.
- Panel administrativo para ventas, usuarios, rifas y configuración.

## 2) Reglas de negocio base

- Precio por boleta: `COP 2.000`.
- Compra mínima por orden: `10` boletas.
- Rango de boleta: `0000` a `9999`.
- Unicidad confirmada: cada número de 4 cifras se vende una sola vez por rifa.
- Capacidad máxima por rifa: `10.000` boletas.
- Regla operativa MVP confirmada (2026-02-19): una sola rifa activa simultáneamente.
- Cierre de rifa: cuando llegue al `100%` de boletas vendidas o se alcance fecha límite.
- Sorteo: número ganador tomado de sorteo/lotería oficial de Colombia en fecha/hora configurables.
- Confirmación definitiva de compra: solo por webhook de pasarela (no por redirección del navegador).
- Política de devoluciones confirmada (2026-02-19): no hay devoluciones por aplazamiento o reprogramación de la rifa; la rifa siempre se juega. Reversión/reembolso solo para pagos duplicados o errores de cobro conciliados.

## 3) Mejoras clave propuestas (sobre tu idea inicial)

- Soporte multi-rifa en el modelo de datos desde el día 1, pero con restricción de solo 1 rifa activa en MVP.
- Estado de boletas por reserva temporal para evitar sobreventa durante pagos pendientes.
- Motor de pasarelas por adaptadores (`PaymentProvider`) para cambiar de Wompi a ePayco sin romper core.
- Event-driven backend (cola) para tareas críticas: correo, auditoría, conciliación, reintentos.
- Libro mayor de transacciones (ledger) inmutable para soporte, disputas y contabilidad.
- SEO híbrido: landing estática (Astro) + rutas dinámicas donde aplique.
- Diseño de marca desde tokens (tipografía, color, motion, componentes) para consistencia visual.

## 4) Alternativas de arquitectura

### A. Monolito fullstack (Nest + SSR frontend)

- Ventaja: menor complejidad inicial.
- Riesgo: SEO y performance de landing suelen quedar por debajo de Astro.

### B. Astro + Nest + Mongo (separado) (RECOMENDADA)

- Ventaja: excelente SEO/performance en landing y backend limpio para pagos.
- Riesgo: coordinación entre dos apps y CORS/session strategy.

### C. Astro + BFF ligero + microservicios

- Ventaja: escalabilidad organizacional.
- Riesgo: overengineering para etapa temprana.

## 5) Stack recomendado

- Front web: `Astro + React (islas) + Tailwind + Motion`.
- API: `NestJS` (REST), `class-validator`, módulos por dominio.
- DB: `MongoDB` (colecciones con índices únicos y transacciones cuando aplique).
- Cola y cache: `Redis` + `BullMQ`.
- Emails: `Resend` o `Postmark` con plantillas HTML responsive.
- Auth admin: JWT + refresh tokens + 2FA opcional.
- Infra: despliegue separado de web y API (Vercel/Node host + Mongo Atlas + Redis gestionado).

## 6) Integración de pagos (decisión estratégica)

### Opción 1: Wompi (recomendada para MVP Colombia)

- Pros:
- Documentación explícita para métodos `CARD`, `PSE` y `NEQUI`.
- Buen encaje local y flujo claro de webhooks.
- Contras:
- Dependencia de un proveedor desde el inicio.

### Opción 2: ePayco

- Pros:
- Soporta múltiples métodos locales y cobertura amplia.
- Contras:
- Mayor variabilidad de integraciones según modalidad (redirect/onpage/plugins).

### Opción 3: Multi-pasarela desde inicio

- Pros:
- Redundancia operativa y negociación futura.
- Contras:
- Más tiempo de salida y más superficie de errores.

### Recomendación

Iniciar con `Wompi` y diseñar el dominio de pagos con interfaz interna para habilitar `ePayco` en fase 2.

Decisión confirmada para MVP (2026-02-19): `Wompi` como pasarela inicial.

## 7) Modelo de dominio (MVP)

Colecciones sugeridas:

- `raffles`
- `raffle_items`
- `tickets`
- `orders`
- `payments`
- `users`
- `email_logs`
- `audit_logs`

Estados sugeridos:

- Rifa: `draft`, `published`, `selling`, `sold_out`, `drawn`, `closed`, `cancelled`.
- Orden: `initiated`, `pending_payment`, `paid`, `failed`, `expired`, `refunded`.
- Ticket: `reserved`, `assigned`, `void`.
- Pago: `pending`, `approved`, `declined`, `voided`, `error`, `refunded`.

Índices críticos:

- `tickets`: índice único por `(raffleId, number4d)`.
- `orders`: índice por `email`, `createdAt`.
- `payments`: índice único por `providerTransactionId`.

## 8) Flujos principales

### Compra

1. Usuario abre landing y elige cantidad (mínimo 10).
2. Backend reserva N boletas por tiempo corto (ej. 10-15 min).
3. Se crea intento de pago y redirección/checkout.
4. Webhook confirma estado final.
5. Si `approved`: asignar boletas definitivamente + enviar email.
6. Si `failed/expired`: liberar reservas.

### Sorteo

1. Rifa llega a 100% o fecha de cierre.
2. Admin ejecuta/supervisa cierre.
3. Se toma número ganador desde el resultado oficial configurado.
4. Se publican resultados y se notifican participantes.

### Reembolsos y fallos

1. Si la rifa no puede jugarse en la fecha prevista, se pasa a estado `postponed`, se reprograma fecha y se comunica a los participantes.
2. No se generan devoluciones por aplazamiento/reprogramación; la rifa mantiene validez hasta su ejecución.
3. En pagos duplicados confirmados por conciliación, se conserva una transacción válida y el excedente se revierte de inmediato.
4. En pagos fallidos/expirados, se liberan boletas reservadas y se notifica al usuario.

## 9) Panel administrativo (MVP)

- Dashboard:
- Total vendido, % de avance, tickets restantes, ingresos brutos.
- Ventas por día y por método de pago.

- Operación:
- Listado de órdenes, pagos y usuarios.
- Reintento de correo y descarga CSV.
- Vista de conciliación contra pasarela.

- Gestión de rifa:
- Crear/editar rifa (premio, imagen, fechas, reglas).
- Definir cantidad máxima de boletas.
- Publicar/cerrar rifa.

- Seguridad:
- Roles (`owner`, `admin`, `support`, `viewer`).
- Auditoría de acciones administrativas.

## 10) SEO y conversión

- Astro para páginas públicas indexables.
- `site` y `@astrojs/sitemap` configurados correctamente.
- `robots.txt`, canonical, OG/Twitter cards.
- JSON-LD (`Product`, `Offer`, `FAQPage` cuando aplique).
- Páginas rápidas: LCP < 2.5s en móvil objetivo.
- Diseño orientado a conversión:
- Hero impactante, CTA fijo, prueba social, barra de progreso de venta, urgencia real con countdown.

## 11) Seguridad y cumplimiento

- Validación fuerte de payloads en Nest (global `ValidationPipe`).
- Idempotencia para webhooks y operaciones de asignación.
- No almacenar PAN/CVV de tarjetas.
- Firma y verificación criptográfica de eventos de pasarela.
- Rate limiting y protección anti-bot en checkout.
- Políticas de tratamiento de datos y términos visibles en landing.

## 12) Riesgo regulatorio (alto)

Antes de operar comercialmente:

- Validar régimen aplicable para rifas en Colombia (municipal/departamental/nacional).
- Confirmar autoridad competente según alcance territorial.
- Definir si aplica operación sistematizada bajo resoluciones recientes de Coljuegos.
- Obtener asesoría legal local especializada.

Este proyecto debe incluir un `go-live legal checklist` obligatorio.

## 13) Roadmap propuesto

### Fase 0 - Descubrimiento (3-5 días)

- Validación legal y operativa.
- Selección final de pasarela.
- Definición visual de marca.

### Fase 1 - MVP funcional (2-3 semanas)

- Landing + checkout + webhook + email tickets.
- Panel admin básico.
- Métricas y observabilidad.

### Fase 2 - Robustez (1-2 semanas)

- Conciliación avanzada.
- Doble pasarela (opcional).
- Mejoras de antifraude y soporte.

### Fase 3 - Escala y marketing (continuo)

- SEO de long-tail, blog, campañas, referidos.
- A/B testing en CTAs y checkout.

## 14) KPIs del producto

- Conversión visita -> compra.
- Tasa de aprobación de pagos.
- Tiempo medio de compra.
- CAC por canal.
- Ticket promedio por orden.
- Tasa de apertura/click de correo de boletas.
- Incidencias por 1.000 transacciones.

## 15) Decisiones abiertas para cerrar alcance

- Sin decisiones abiertas para MVP inicial.

## 16) Referencias oficiales consultadas (2026-02-19)

- Wompi - métodos de pago (`CARD`, `PSE`, `NEQUI`): https://docs.wompi.co/docs/colombia/metodos-de-pago/
- Wompi - webhooks: https://docs.wompi.co/docs/colombia/eventos-pagos-a-terceros/
- ePayco - medios de pago (PSE, tarjetas, Nequi, etc.): https://soporte.epayco.com/knowledge-base/medios-de-pago-con-los-que-cuenta-epayco/
- Mercado Pago Colombia - medios de pago checkout: https://www.mercadopago.com.co/developers/es/docs/checkout-bricks/payment-brick/payment-methods
- Coljuegos - juegos promocionales y documentos: https://www.coljuegos.gov.co/publicaciones/5090/juegos-promocionales/
- Coljuegos - consulta pública 2025 sobre rifas operadas por internet: https://www.coljuegos.gov.co/publicaciones/101067/coljuegos-publica-para-comentarios-el-proyecto-que-regula-rifas-operadas-por-internet/
- Astro - sitemap integration: https://docs.astro.build/en/guides/integrations-guide/sitemap/
- Astro - metadata: https://docs.astro.build/en/recipes/adding-page-titles/
- Astro - OG images: https://docs.astro.build/en/recipes/build-custom-social-images/
- MongoDB - transacciones en replica set/sharded cluster: https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
