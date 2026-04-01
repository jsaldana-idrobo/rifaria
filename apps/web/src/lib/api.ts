export interface PublicPrizeDraw {
  id: string;
  title: string;
  description: string;
  prizeType: string;
  displayValue: string;
  imageUrl: string;
  drawAt: string;
  drawSource: string;
  status: "scheduled" | "drawn" | "cancelled";
  isMajorPrize: boolean;
  winningNumber: string | null;
  proofUrl: string | null;
  winnerLabel: string | null;
}

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
  featuredPrize: PublicPrizeDraw | null;
  upcomingPrizeDraws: PublicPrizeDraw[];
  completedPrizeDraws: PublicPrizeDraw[];
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
  upcomingPrizeDraws: Array<{
    id: string;
    title: string;
    displayValue: string;
    drawAt: string;
    drawSource: string;
    status: string;
    isMajorPrize: boolean;
  }>;
  expiresAt: string | null;
  failureReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const fallbackUpcomingPrizeDraws: PublicPrizeDraw[] = [
  {
    id: "cash-drop",
    title: "Lanzamiento en efectivo",
    description: "Primer corte publico para compradores ya confirmados.",
    prizeType: "cash",
    displayValue: "$10.000.000",
    imageUrl:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=80",
    drawAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    drawSource: "Loteria de Medellin",
    status: "scheduled",
    isMajorPrize: false,
    winningNumber: null,
    proofUrl: null,
    winnerLabel: null,
  },
  {
    id: "moto-week",
    title: "Moto de media campana",
    description: "Las mismas boletas siguen activas para un segundo premio.",
    prizeType: "vehicle",
    displayValue: "Moto Yamaha",
    imageUrl:
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
    drawAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    drawSource: "Loteria de Medellin",
    status: "scheduled",
    isMajorPrize: false,
    winningNumber: null,
    proofUrl: null,
    winnerLabel: null,
  },
  {
    id: "major-prize",
    title: "Premio mayor de cierre",
    description:
      "El cierre final de la campana mantiene la misma base de compradores.",
    prizeType: "vehicle",
    displayValue: "Carro 0 km",
    imageUrl:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
    drawAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 24).toISOString(),
    drawSource: "Loteria de Medellin",
    status: "scheduled",
    isMajorPrize: true,
    winningNumber: null,
    proofUrl: null,
    winnerLabel: null,
  },
];

const fallbackCompletedPrizeDraws: PublicPrizeDraw[] = [
  {
    id: "weekly-bonus",
    title: "Bono de apertura",
    description: "Resultado publico ya publicado para todos.",
    prizeType: "cash",
    displayValue: "$2.000.000",
    imageUrl:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=80",
    drawAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    drawSource: "Loteria de Medellin",
    status: "drawn",
    isMajorPrize: false,
    winningNumber: "1842",
    proofUrl: "https://example.com/resultados/1842",
    winnerLabel: "Laura | la***@correo.com",
  },
  {
    id: "no-winner",
    title: "Premio express",
    description:
      "El numero ganador fue publico aunque nadie lo tuviera pagado.",
    prizeType: "other",
    displayValue: "Bono especial",
    imageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    drawAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    drawSource: "Loteria de Medellin",
    status: "drawn",
    isMajorPrize: false,
    winningNumber: "9031",
    proofUrl: "https://example.com/resultados/9031",
    winnerLabel: null,
  },
];

const fallbackRaffle: PublicRaffle = {
  _id: "preview",
  title: "Rifa Oficial Rifaria",
  description:
    "Compra una sola vez y participa en multiples fechas con premios visibles, resultados publicos y seguimiento seguro.",
  prizeName: "Carro 0 km",
  prizeImageUrl:
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
  drawAt: fallbackUpcomingPrizeDraws[0].drawAt,
  drawSource: fallbackUpcomingPrizeDraws[0].drawSource,
  totalTickets: 10000,
  soldTickets: 2730,
  status: "selling",
  featuredPrize: fallbackUpcomingPrizeDraws[2],
  upcomingPrizeDraws: fallbackUpcomingPrizeDraws,
  completedPrizeDraws: fallbackCompletedPrizeDraws,
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
