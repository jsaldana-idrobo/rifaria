import { useEffect, useMemo, useState } from "react";
import { fetchOrderStatus, type PublicOrderStatus } from "@/lib/api";

type OrderStatusCardProps = Readonly<{
  readonly orderId: string | null;
}>;

const FINAL_STATUSES = new Set<PublicOrderStatus["status"]>([
  "paid",
  "failed",
  "expired",
  "refunded",
]);

function mapStatusLabel(status: PublicOrderStatus["status"]): string {
  switch (status) {
    case "paid":
      return "Pago aprobado";
    case "failed":
      return "Pago rechazado";
    case "expired":
      return "Reserva vencida";
    case "refunded":
      return "Pago reversado";
    case "pending_payment":
      return "Pago en validacion";
    case "initiated":
    default:
      return "Orden creada";
  }
}

function mapStatusMessage(status: PublicOrderStatus["status"]): string {
  switch (status) {
    case "paid":
      return "Pago aprobado. Tus boletas ya fueron asignadas y enviadas a tu correo.";
    case "failed":
      return "El pago fue rechazado. Puedes intentar una nueva compra.";
    case "expired":
      return "La reserva de boletas expiro antes de confirmar el pago.";
    case "refunded":
      return "El pago fue reversado y la orden quedo en estado reembolsado.";
    case "pending_payment":
      return "Pago en validacion. Estamos esperando confirmacion del webhook.";
    case "initiated":
    default:
      return "La orden fue creada. Falta confirmar el intento de pago.";
  }
}

export function OrderStatusCard({ orderId }: OrderStatusCardProps) {
  const [status, setStatus] = useState<PublicOrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let isMounted = true;
    let timer: ReturnType<typeof globalThis.setTimeout> | null = null;

    const poll = async () => {
      try {
        const result = await fetchOrderStatus(orderId);
        if (!isMounted) {
          return;
        }

        setStatus(result);
        setError(null);
        setLoading(false);

        if (!FINAL_STATUSES.has(result.status)) {
          timer = globalThis.setTimeout(() => {
            void poll();
          }, 8000);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setLoading(false);
        setError(
          err instanceof Error ? err.message : "No se pudo consultar la orden",
        );
      }
    };

    void poll();

    return () => {
      isMounted = false;
      if (timer) {
        globalThis.clearTimeout(timer);
      }
    };
  }, [orderId]);

  const statusMessage = useMemo(() => {
    if (!status) {
      return null;
    }

    return mapStatusMessage(status.status);
  }, [status]);

  if (!orderId) {
    return (
      <section className="status-card glass-card">
        <div className="status-top">
          <p className="pill pill-outline">Compra en proceso</p>
          <h2 className="brand-title">Resumen de la orden</h2>
          <p className="status-note">
            Estamos validando el estado del intento de pago. Si ya abriste el
            checkout, revisa tambien tu correo y tu pasarela.
          </p>
        </div>

        <a className="cta-btn status-action" href="/">
          Volver al inicio
        </a>
      </section>
    );
  }

  return (
    <section className="status-card glass-card">
      <div className="status-top">
        <p className="pill">Estado de orden</p>
        <h2 className="brand-title">Resumen de la orden</h2>
        <p className="status-note">
          Esta tarjeta se actualiza sola mientras llega la confirmacion del
          pago. Mantiene el mismo tono visual del checkout para que el usuario
          no sienta que salio a otra app.
        </p>
      </div>

      <div className="status-grid">
        <div className="summary">
          <strong>Orden</strong>
          <span>{orderId}</span>
        </div>
        <div className="summary">
          <strong>Estado actual</strong>
          <span>
            {loading
              ? "consultando..."
              : mapStatusLabel(status?.status ?? "initiated")}
          </span>
        </div>
      </div>

      {statusMessage ? <p className="status-note">{statusMessage}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {status?.ticketNumbers?.length ? (
        <div className="ticket-preview">
          <p>Tus boletas confirmadas:</p>
          <div>
            {status.ticketNumbers.map((ticket) => (
              <span key={ticket}>{ticket}</span>
            ))}
          </div>
        </div>
      ) : null}

      {status?.upcomingPrizeDraws?.length ? (
        <div className="status-schedule">
          <p>Premios que sigues jugando:</p>
          <div className="status-schedule-list">
            {status.upcomingPrizeDraws.map((draw) => (
              <article key={draw.id} className="status-schedule-item">
                <strong>{draw.title}</strong>
                <span>{draw.displayValue}</span>
                <small>
                  {new Intl.DateTimeFormat("es-CO", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(draw.drawAt))}{" "}
                  | {draw.drawSource}
                </small>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <a className="cta-btn status-action" href="/">
        Volver al inicio
      </a>
    </section>
  );
}
