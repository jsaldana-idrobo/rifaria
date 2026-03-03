import { useEffect, useMemo, useState } from "react";
import { fetchOrderStatus, type PublicOrderStatus } from "@/lib/api";

interface OrderStatusCardProps {
  readonly orderId: string | null;
}

const FINAL_STATUSES = new Set<PublicOrderStatus["status"]>([
  "paid",
  "failed",
  "expired",
  "refunded",
]);

function mapStatusMessage(status: PublicOrderStatus["status"]): string {
  switch (status) {
    case "paid":
      return "Pago aprobado. Tus boletas ya fueron asignadas y enviadas a tu correo.";
    case "failed":
      return "El pago fue rechazado. Puedes intentar una nueva compra.";
    case "expired":
      return "La reserva de boletas expiró antes de confirmar el pago.";
    case "refunded":
      return "El pago fue reversado y la orden quedó en estado reembolsado.";
    case "pending_payment":
      return "Pago en validación. Estamos esperando confirmación del webhook.";
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
      <section className="glass-card" style={{ padding: "34px" }}>
        <p className="pill">Compra en proceso</p>
        <h1
          className="brand-title"
          style={{ fontSize: "4rem", margin: "12px 0 8px" }}
        >
          Gracias por participar
        </h1>
        <p>
          Estamos validando el estado de tu pago. Si recibiste un link de pago,
          revísalo en tu correo.
        </p>
        <a
          className="cta-btn"
          href="/"
          style={{
            display: "inline-flex",
            marginTop: "14px",
            textDecoration: "none",
          }}
        >
          Volver al inicio
        </a>
      </section>
    );
  }

  return (
    <section className="glass-card" style={{ padding: "34px" }}>
      <p className="pill">Estado de orden</p>
      <h1
        className="brand-title"
        style={{ fontSize: "4rem", margin: "12px 0 8px" }}
      >
        Gracias por participar
      </h1>

      <div className="summary">
        <strong>Orden:</strong> {orderId}
        <strong>Estado:</strong>{" "}
        {loading ? "consultando..." : (status?.status ?? "desconocido")}
      </div>

      {statusMessage ? (
        <p style={{ marginTop: "12px" }}>{statusMessage}</p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}

      {status?.ticketNumbers?.length ? (
        <div className="ticket-preview" style={{ marginTop: "12px" }}>
          <p>Tus boletas confirmadas:</p>
          <div>
            {status.ticketNumbers.map((ticket) => (
              <span key={ticket}>{ticket}</span>
            ))}
          </div>
        </div>
      ) : null}

      <a
        className="cta-btn"
        href="/"
        style={{
          display: "inline-flex",
          marginTop: "14px",
          textDecoration: "none",
        }}
      >
        Volver al inicio
      </a>
    </section>
  );
}
