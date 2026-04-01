import { useMemo, useState } from "react";
import type { SyntheticEvent } from "react";
import { createCheckout, createOrder } from "@/lib/api";

interface PurchaseWidgetProps {
  readonly raffleTitle: string;
  readonly eligiblePrizeCount?: number;
}

const TICKET_PRICE = 2000;
const MIN_TICKETS = 10;
const TICKET_BUNDLES = [
  {
    qty: 10,
    name: "Arranque",
    tag: "Minimo",
    note: "Entrada minima para activar la compra",
  },
  {
    qty: 25,
    name: "Impulso",
    tag: "Flexible",
    note: "Balance entre cobertura y presupuesto",
  },
  {
    qty: 50,
    name: "Cobertura",
    tag: "Popular",
    note: "Pack fuerte para campanas con mas traccion",
  },
  {
    qty: 100,
    name: "Dominio",
    tag: "Maximo",
    note: "Pensado para compradores que van con todo",
  },
] as const;

export function PurchaseWidget({
  raffleTitle,
  eligiblePrizeCount = 1,
}: PurchaseWidgetProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ticketQty, setTicketQty] = useState(MIN_TICKETS);
  const [ticketPreview, setTicketPreview] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => ticketQty * TICKET_PRICE, [ticketQty]);

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (ticketQty < MIN_TICKETS) {
      setError("La compra minima es de 10 boletas.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const browserWindow = globalThis.window;
      if (!browserWindow) {
        throw new Error("No fue posible abrir el checkout en este entorno");
      }

      const order = await createOrder({
        fullName,
        email,
        phone,
        ticketQty,
      });

      setTicketPreview(order.ticketNumbers ?? []);

      const checkout = await createCheckout(
        order._id,
        `${browserWindow.location.origin}/gracias?order=${encodeURIComponent(order._id)}`,
      );

      browserWindow.location.assign(checkout.checkoutUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No fue posible iniciar la compra";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="comprar" className="buy-card glass-card">
      <div className="buy-header buy-panel">
        <p className="section-kicker">Compra inmediata</p>
        <h2 className="brand-title">Elige tu pack</h2>
        <p className="buy-lead">
          Selecciona una opcion, mira el valor al instante y entra al checkout.
          Tus boletas quedan activas para {eligiblePrizeCount} premio
          {eligiblePrizeCount === 1 ? "" : "s"} programado
          {eligiblePrizeCount === 1 ? "" : "s"}.
        </p>

        <div className="bundle-grid" aria-label="Packs sugeridos">
          {TICKET_BUNDLES.map((bundle) => {
            const isActive = bundle.qty === ticketQty;
            const bundleTotal = bundle.qty * TICKET_PRICE;

            return (
              <button
                key={bundle.qty}
                type="button"
                className={`bundle-card${isActive ? " is-active" : ""}`}
                onClick={() => setTicketQty(bundle.qty)}
              >
                <div className="bundle-topline">
                  <span className="bundle-qty">x{bundle.qty}</span>
                  <span className="bundle-tag">{bundle.tag}</span>
                </div>
                <strong className="bundle-name">{bundle.name}</strong>
                <span className="bundle-price">
                  ${bundleTotal.toLocaleString("es-CO")} COP
                </span>
                <span className="bundle-note">{bundle.note}</span>
              </button>
            );
          })}
        </div>

        <div className="buy-trust-row" aria-label="Ventajas de compra">
          <span className="buy-trust-pill">PSE, tarjeta y Nequi</span>
          <span className="buy-trust-pill">Correo al confirmar pago</span>
          <span className="buy-trust-pill">
            {eligiblePrizeCount} premio{eligiblePrizeCount === 1 ? "" : "s"}{" "}
            activo
            {eligiblePrizeCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <form
        className="buy-form"
        onSubmit={handleSubmit}
        aria-busy={isSubmitting}
      >
        <div className="buy-form-grid">
          <label>
            <span>Nombre completo</span>
            <input
              type="text"
              required
              minLength={3}
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ej: Sebastian Rojas"
            />
          </label>

          <label>
            <span>Correo</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
            />
          </label>

          <label className="full-span">
            <span>Celular</span>
            <input
              type="tel"
              required
              minLength={7}
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="3001234567"
            />
          </label>
        </div>

        <label className="full-span">
          Cantidad de boletas
          <div className="qty-row">
            <button
              type="button"
              className="qty-btn"
              onClick={() =>
                setTicketQty((current) => Math.max(MIN_TICKETS, current - 1))
              }
              aria-label="Reducir cantidad"
            >
              -
            </button>
            <input
              type="number"
              min={MIN_TICKETS}
              inputMode="numeric"
              aria-label="Cantidad de boletas"
              value={ticketQty}
              onChange={(event) =>
                setTicketQty(Math.max(MIN_TICKETS, Number(event.target.value)))
              }
            />
            <button
              type="button"
              className="qty-btn"
              onClick={() => setTicketQty((current) => current + 1)}
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>
        </label>

        <div className="summary">
          <div>
            <strong>{ticketQty}</strong> boletas x <strong>$2.000 COP</strong>
          </div>
          <div className="summary-total">
            Total: ${total.toLocaleString("es-CO")} COP
          </div>
          <div className="summary-note">
            Compra minima: {MIN_TICKETS} boletas por orden. Puedes empezar por
            un pack y despues subir la cantidad libremente.
          </div>
        </div>

        {ticketPreview.length > 0 ? (
          <div className="ticket-preview">
            <p>Boletas reservadas para {raffleTitle}:</p>
            <div>
              {ticketPreview.slice(0, 12).map((ticket) => (
                <span key={ticket}>{ticket}</span>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="error" role="status" aria-live="polite">
            {error}
          </p>
        ) : null}

        <p className="buy-footnote">
          Seras redirigido al checkout seguro para completar el pago de{" "}
          {raffleTitle}.
        </p>

        <button className="cta-btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Procesando..." : "Comprar Ahora"}
        </button>
      </form>
    </section>
  );
}
