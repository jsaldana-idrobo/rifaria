import { useState } from "react";
import type { SyntheticEvent } from "react";
import { getApiBaseUrl } from "@/lib/api";

interface DashboardData {
  raffle: {
    title: string;
    status: string;
    soldTickets: number;
    totalTickets: number;
    grossRevenueCop: number;
    drawAt: string;
    drawSource: string;
    reservedTickets: number;
    assignedTickets: number;
    wonTickets: number;
    availableTickets: number;
    buyers: number;
    nextScheduledPrize: {
      id: string;
      title: string;
      drawAt: string;
      displayValue: string;
    } | null;
  };
  prizeDraws: AdminPrizeDraw[];
  orderCounts: Array<{ _id: string; count: number }>;
  paymentCounts: Array<{ _id: string; count: number }>;
}

interface AdminPrizeDraw {
  _id: string;
  title: string;
  displayValue: string;
  drawAt: string;
  drawSource: string;
  status: string;
  isMajorPrize: boolean;
  winningNumber: string | null;
  drawResultSourceUrl: string | null;
  winnerFullNameSnapshot: string | null;
}

interface BuyerRow {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  ticketNumbers: string[];
  emailDeliveryStatus: string | null;
  createdAt: string;
}

interface TicketInventoryResponse {
  summary: {
    totalTickets: number;
    availableTickets: number;
    reservedTickets: number;
    assignedTickets: number;
    wonTickets: number;
  };
  rows: Array<{
    _id?: string;
    number4d: string;
    status: string;
    wonPrizeDrawId: string | null;
    buyer?: {
      fullName?: string;
      email?: string;
      phone?: string;
      status?: string;
      emailDeliveryStatus?: string | null;
    };
  }>;
}

interface AdminData {
  dashboard: DashboardData;
  buyers: BuyerRow[];
  ticketInventory: TicketInventoryResponse;
}

interface PrizeFormState {
  title: string;
  description: string;
  displayValue: string;
  prizeType: "cash" | "vehicle" | "property" | "bundle" | "other";
  imageUrl: string;
  drawAt: string;
  drawSource: string;
  isMajorPrize: boolean;
}

interface SettleFormState {
  winningNumber: string;
  drawResultSourceUrl: string;
}

const INITIAL_PRIZE_FORM: PrizeFormState = {
  title: "",
  description: "",
  displayValue: "",
  prizeType: "cash",
  imageUrl: "",
  drawAt: "",
  drawSource: "",
  isMajorPrize: false,
};

const EMPTY_SETTLE_FORM: SettleFormState = {
  winningNumber: "",
  drawResultSourceUrl: "",
};

async function fetchWithAuth<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: "No se pudo completar la operacion" }));
    throw new Error(body.message || "No se pudo completar la operacion");
  }

  return response.json() as Promise<T>;
}

export function AdminPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [prizeForm, setPrizeForm] =
    useState<PrizeFormState>(INITIAL_PRIZE_FORM);
  const [settleForms, setSettleForms] = useState<
    Record<string, SettleFormState>
  >({});

  const loadAdminData = async (accessToken: string, search = "") => {
    const [dashboard, buyers, ticketInventory] = await Promise.all([
      fetchWithAuth<DashboardData>("/admin/dashboard", accessToken),
      fetchWithAuth<BuyerRow[]>("/admin/buyers?limit=12", accessToken),
      fetchWithAuth<TicketInventoryResponse>(
        `/admin/tickets?limit=24${search ? `&search=${encodeURIComponent(search)}` : ""}`,
        accessToken,
      ),
    ]);

    setData({
      dashboard,
      buyers,
      ticketInventory,
    });
  };

  const login = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Credenciales invalidas");
      }

      const body = (await response.json()) as { accessToken: string };
      setToken(body.accessToken);
      await loadAdminData(body.accessToken, inventorySearch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const createPrizeDraw = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchWithAuth("/admin/prize-draws", token, {
        method: "POST",
        body: JSON.stringify({
          ...prizeForm,
          drawAt: new Date(prizeForm.drawAt).toISOString(),
        }),
      });

      setPrizeForm(INITIAL_PRIZE_FORM);
      await loadAdminData(token, inventorySearch);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear el premio",
      );
    } finally {
      setLoading(false);
    }
  };

  const settlePrizeDraw = async (
    event: SyntheticEvent<HTMLFormElement>,
    prizeDrawId: string,
  ) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    const form = settleForms[prizeDrawId] ?? EMPTY_SETTLE_FORM;
    setLoading(true);
    setError(null);

    try {
      await fetchWithAuth(`/admin/prize-draws/${prizeDrawId}/settle`, token, {
        method: "POST",
        body: JSON.stringify(form),
      });

      setSettleForms((current) => ({
        ...current,
        [prizeDrawId]: EMPTY_SETTLE_FORM,
      }));
      await loadAdminData(token, inventorySearch);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo publicar el resultado",
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelPrizeDraw = async (prizeDrawId: string) => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchWithAuth(`/admin/prize-draws/${prizeDrawId}/cancel`, token, {
        method: "POST",
      });
      await loadAdminData(token, inventorySearch);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cancelar el premio",
      );
    } finally {
      setLoading(false);
    }
  };

  const searchInventory = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await loadAdminData(token, inventorySearch);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar inventario",
      );
    } finally {
      setLoading(false);
    }
  };

  const prizeDraws = data?.dashboard.prizeDraws ?? [];
  const buyers = data?.buyers ?? [];
  const inventory = data?.ticketInventory;

  return (
    <section className="admin-panel glass-card">
      <div className="buy-header">
        <p className="section-kicker">Control diario</p>
        <h2 className="brand-title">Panel operativo</h2>
        <p className="buy-lead">
          Gestiona premios, compradores, inventario y resultados desde una sola
          consola visual.
        </p>

        <div className="buy-points" aria-label="Puntos del panel">
          <div className="buy-point">
            <strong>Gestion de premios</strong>
            <span>
              Crea nuevas fechas, marca el premio mayor y publica resultados.
            </span>
          </div>
          <div className="buy-point">
            <strong>Inventario de boletas</strong>
            <span>
              Revisa disponibles, reservadas, asignadas y ganadoras con busqueda
              por numero o comprador.
            </span>
          </div>
          <div className="buy-point">
            <strong>Compradores recientes</strong>
            <span>
              Verifica ordenes pagadas, pendientes y estado del correo sin salir
              del panel.
            </span>
          </div>
        </div>
      </div>

      {token === null ? (
        <form className="buy-form" onSubmit={login}>
          <label>
            <span>Correo admin</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? (
            <p className="error" role="status" aria-live="polite">
              {error}
            </p>
          ) : null}

          <button type="submit" className="cta-btn" disabled={loading}>
            {loading ? "Validando..." : "Entrar"}
          </button>
        </form>
      ) : null}

      <div className="admin-preview-grid">
        <section className="admin-section glass-card">
          <div className="section-heading">
            <p className="section-kicker">Gestion de premios</p>
            <h3 className="brand-title">Calendario operativo</h3>
            <p className="section-copy">
              Crea fechas nuevas y publica los numeros ganadores de cada corte.
            </p>
          </div>

          {token ? (
            <form className="admin-form-grid" onSubmit={createPrizeDraw}>
              <label>
                <span>Titulo</span>
                <input
                  type="text"
                  required
                  value={prizeForm.title}
                  onChange={(event) =>
                    setPrizeForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Valor visible</span>
                <input
                  type="text"
                  required
                  value={prizeForm.displayValue}
                  onChange={(event) =>
                    setPrizeForm((current) => ({
                      ...current,
                      displayValue: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="full-span">
                <span>Descripcion</span>
                <input
                  type="text"
                  required
                  value={prizeForm.description}
                  onChange={(event) =>
                    setPrizeForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Tipo</span>
                <select
                  value={prizeForm.prizeType}
                  onChange={(event) =>
                    setPrizeForm((current) => ({
                      ...current,
                      prizeType: event.target
                        .value as PrizeFormState["prizeType"],
                    }))
                  }
                >
                  <option value="cash">Dinero</option>
                  <option value="vehicle">Vehiculo</option>
                  <option value="property">Propiedad</option>
                  <option value="bundle">Combo</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label>
                <span>Fecha</span>
                <input
                  type="datetime-local"
                  required
                  value={prizeForm.drawAt}
                  onChange={(event) =>
                    setPrizeForm((current) => ({
                      ...current,
                      drawAt: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="full-span">
                <span>Fuente del sorteo</span>
                <input
                  type="text"
                  required
                  value={prizeForm.drawSource}
                  onChange={(event) =>
                    setPrizeForm((current) => ({
                      ...current,
                      drawSource: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="full-span">
                <span>Imagen</span>
                <input
                  type="url"
                  required
                  value={prizeForm.imageUrl}
                  onChange={(event) =>
                    setPrizeForm((current) => ({
                      ...current,
                      imageUrl: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="admin-check full-span">
                <input
                  type="checkbox"
                  checked={prizeForm.isMajorPrize}
                  onChange={(event) =>
                    setPrizeForm((current) => ({
                      ...current,
                      isMajorPrize: event.target.checked,
                    }))
                  }
                />
                <span>Marcar como premio mayor</span>
              </label>

              <button type="submit" className="cta-btn" disabled={loading}>
                {loading ? "Guardando..." : "Crear premio"}
              </button>
            </form>
          ) : (
            <p className="summary-note">
              Inicia sesion para crear premios, publicar resultados o cancelar
              fechas pendientes.
            </p>
          )}

          <div className="admin-list">
            {prizeDraws.length > 0 ? (
              prizeDraws.map((draw) => {
                const settleForm = settleForms[draw._id] ?? EMPTY_SETTLE_FORM;

                return (
                  <article key={draw._id} className="admin-ticket-row">
                    <div>
                      <strong>{draw.title}</strong>
                      <span>
                        {draw.displayValue} |{" "}
                        {new Intl.DateTimeFormat("es-CO", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(draw.drawAt))}
                      </span>
                      <small>
                        {draw.status}
                        {draw.winningNumber ? ` | ${draw.winningNumber}` : ""}
                        {draw.isMajorPrize ? " | premio mayor" : ""}
                      </small>
                    </div>

                    {token && draw.status === "scheduled" ? (
                      <form
                        className="admin-inline-form"
                        onSubmit={(event) => settlePrizeDraw(event, draw._id)}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="1234"
                          value={settleForm.winningNumber}
                          onChange={(event) =>
                            setSettleForms((current) => ({
                              ...current,
                              [draw._id]: {
                                ...settleForm,
                                winningNumber: event.target.value,
                              },
                            }))
                          }
                        />
                        <input
                          type="url"
                          placeholder="https://prueba.com"
                          value={settleForm.drawResultSourceUrl}
                          onChange={(event) =>
                            setSettleForms((current) => ({
                              ...current,
                              [draw._id]: {
                                ...settleForm,
                                drawResultSourceUrl: event.target.value,
                              },
                            }))
                          }
                        />
                        <button
                          type="submit"
                          className="cta-btn"
                          disabled={loading}
                        >
                          Publicar
                        </button>
                        <button
                          type="button"
                          className="pill pill-outline"
                          onClick={() => cancelPrizeDraw(draw._id)}
                          disabled={loading}
                        >
                          Cancelar
                        </button>
                      </form>
                    ) : (
                      <span className="summary-note">
                        {draw.winnerFullNameSnapshot
                          ? `Ganador: ${draw.winnerFullNameSnapshot}`
                          : "Resultado aun no publicado"}
                      </span>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="summary-note">
                El calendario aparecera aqui cuando cargues premios o inicies
                sesion.
              </p>
            )}
          </div>
        </section>

        <section className="admin-section glass-card">
          <div className="section-heading">
            <p className="section-kicker">Inventario de boletas</p>
            <h3 className="brand-title">Lectura operativa</h3>
            <p className="section-copy">
              Busca por numero, correo, telefono u orden para revisar la boleta
              exacta y su comprador.
            </p>
          </div>

          <form className="admin-toolbar" onSubmit={searchInventory}>
            <input
              type="search"
              placeholder="Buscar por numero, correo, telefono u orden"
              value={inventorySearch}
              onChange={(event) => setInventorySearch(event.target.value)}
            />
            <button
              className="cta-btn"
              type="submit"
              disabled={!token || loading}
            >
              Buscar
            </button>
          </form>

          <div className="admin-summary-grid">
            <div className="summary">
              <strong>Disponibles</strong>
              <span>
                {inventory?.summary.availableTickets ?? "--"} /{" "}
                {data?.dashboard.raffle.totalTickets ?? "--"}
              </span>
            </div>
            <div className="summary">
              <strong>Reservadas</strong>
              <span>{inventory?.summary.reservedTickets ?? "--"}</span>
            </div>
            <div className="summary">
              <strong>Asignadas</strong>
              <span>{inventory?.summary.assignedTickets ?? "--"}</span>
            </div>
            <div className="summary">
              <strong>Ganadoras</strong>
              <span>{inventory?.summary.wonTickets ?? "--"}</span>
            </div>
          </div>

          <div className="inventory-list">
            {inventory?.rows?.length ? (
              inventory.rows.map((row) => (
                <article
                  key={`${row.number4d}-${row.buyer?.email ?? "free"}`}
                  className="inventory-row"
                >
                  <strong>{row.number4d}</strong>
                  <span>{row.status}</span>
                  <span>{row.buyer?.fullName ?? "Sin comprador"}</span>
                  <small>
                    {row.buyer?.email ?? "Disponible"}
                    {row.wonPrizeDrawId ? " | ya gano" : ""}
                  </small>
                </article>
              ))
            ) : (
              <p className="summary-note">
                Inicia sesion para ver el inventario vivo de la campana.
              </p>
            )}
          </div>
        </section>

        <section className="admin-section glass-card">
          <div className="section-heading">
            <p className="section-kicker">Compradores recientes</p>
            <h3 className="brand-title">Ordenes y correo</h3>
            <p className="section-copy">
              Supervisa quien compro, en que estado esta su orden y si el correo
              quedo enviado, en cola o con fallo.
            </p>
          </div>

          <div className="admin-summary-grid">
            <div className="summary">
              <strong>Compradores</strong>
              <span>{data?.dashboard.raffle.buyers ?? "--"}</span>
            </div>
            <div className="summary">
              <strong>Ingresos</strong>
              <span>
                $
                {data?.dashboard.raffle.grossRevenueCop?.toLocaleString(
                  "es-CO",
                ) ?? "--"}{" "}
                COP
              </span>
            </div>
            <div className="summary">
              <strong>Siguiente premio</strong>
              <span>
                {data?.dashboard.raffle.nextScheduledPrize?.title ??
                  "Pendiente"}
              </span>
            </div>
          </div>

          <div className="admin-list">
            {buyers.length > 0 ? (
              buyers.map((buyer) => (
                <article key={buyer._id} className="admin-ticket-row">
                  <div>
                    <strong>{buyer.fullName}</strong>
                    <span>
                      {buyer.email} | {buyer.phone}
                    </span>
                    <small>
                      {buyer.status}
                      {buyer.emailDeliveryStatus
                        ? ` | correo ${buyer.emailDeliveryStatus}`
                        : ""}
                    </small>
                  </div>
                  <span className="summary-note">
                    {buyer.ticketNumbers.length > 0
                      ? buyer.ticketNumbers.join(", ")
                      : "Sin boletas visibles"}
                  </span>
                </article>
              ))
            ) : (
              <p className="summary-note">
                Los compradores apareceran aqui cuando el panel tenga acceso.
              </p>
            )}
          </div>
        </section>
      </div>

      {error ? (
        <p className="error" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
    </section>
  );
}
