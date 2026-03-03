export interface PublicRaffle {
  _id: string;
  title: string;
  description: string;
  prizeName: string;
  prizeImageUrl: string;
  drawAt: string;
  drawSource: string;
  totalTickets: number;
  soldTickets: number;
  status: string;
}

export interface CreateOrderPayload {
  fullName: string;
  email: string;
  phone: string;
  ticketQty: number;
}

export interface PublicOrderStatus {
  id: string;
  status:
    | "initiated"
    | "pending_payment"
    | "paid"
    | "failed"
    | "expired"
    | "refunded";
  ticketQty: number;
  totalAmount: number;
  ticketNumbers: string[];
  expiresAt: string | null;
  failureReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const fallbackRaffle: PublicRaffle = {
  _id: "preview",
  title: "Rifa Oficial Rifaria",
  description:
    "Compra tus boletas oficiales y recibe tus numeros al instante por correo con una experiencia segura y auditable.",
  prizeName: "Moto especial de lanzamiento",
  prizeImageUrl:
    "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
  drawAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
  drawSource: "Loteria oficial de Colombia (configurada por administrador)",
  totalTickets: 10000,
  soldTickets: 2730,
  status: "selling",
};

export function getApiBaseUrl(): string {
  const configuredBaseUrl = (import.meta.env.PUBLIC_API_BASE_URL ?? "").trim();
  const browserWindow = globalThis.window;

  if (configuredBaseUrl.length > 0) {
    if (browserWindow) {
      try {
        const parsed = new URL(configuredBaseUrl);
        const configuredIsLocal = ["localhost", "127.0.0.1"].includes(
          parsed.hostname,
        );
        const runningIsLocal = ["localhost", "127.0.0.1"].includes(
          browserWindow.location.hostname,
        );

        if (configuredIsLocal && !runningIsLocal) {
          return `${browserWindow.location.origin}/v1`;
        }
      } catch {
        return `${browserWindow.location.origin}/v1`;
      }
    }

    return configuredBaseUrl;
  }

  if (browserWindow) {
    return `${browserWindow.location.origin}/v1`;
  }

  return "http://localhost:4000/v1";
}

export async function fetchActiveRaffle(): Promise<PublicRaffle> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/public/raffle/active`);
    if (!response.ok) {
      return fallbackRaffle;
    }

    return (await response.json()) as PublicRaffle;
  } catch {
    return fallbackRaffle;
  }
}

export async function createOrder(payload: CreateOrderPayload) {
  const response = await fetch(`${getApiBaseUrl()}/public/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: "No se pudo crear la orden" }));
    throw new Error(body.message || "No se pudo crear la orden");
  }

  return response.json() as Promise<{
    _id: string;
    totalAmount: number;
    ticketNumbers: string[];
    status: string;
  }>;
}

export async function createCheckout(orderId: string, returnUrl: string) {
  const response = await fetch(
    `${getApiBaseUrl()}/public/payments/wompi/checkout`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        returnUrl,
      }),
    },
  );

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: "No se pudo iniciar el pago" }));
    throw new Error(body.message || "No se pudo iniciar el pago");
  }

  return response.json() as Promise<{
    checkoutUrl: string;
    reference: string;
    amountInCents: number;
    currency: string;
  }>;
}

export async function fetchOrderStatus(
  orderId: string,
): Promise<PublicOrderStatus> {
  const response = await fetch(
    `${getApiBaseUrl()}/public/orders/${encodeURIComponent(orderId)}`,
  );

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: "No se pudo consultar la orden" }));
    throw new Error(body.message || "No se pudo consultar la orden");
  }

  return response.json() as Promise<PublicOrderStatus>;
}
