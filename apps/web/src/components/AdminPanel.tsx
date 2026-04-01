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
  };
  orderCounts: Array<{ _id: string; count: number }>;
  paymentCounts: Array<{ _id: string; count: number }>;
}

export function AdminPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      const dashboardResponse = await fetch(
        `${getApiBaseUrl()}/admin/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${body.accessToken}`,
          },
        },
      );

      if (!dashboardResponse.ok) {
        throw new Error("No se pudo cargar dashboard");
      }

      const dashboard = (await dashboardResponse.json()) as DashboardData;
      setData(dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="admin-panel glass-card">
      <div className="buy-header">
        <p className="section-kicker">Control diario</p>
        <h2 className="brand-title">Panel operativo</h2>
        <p className="buy-lead">
          Visualiza ventas, pagos y avance de la rifa con el mismo sistema
          visual de la experiencia publica.
        </p>

        <div className="buy-points" aria-label="Puntos del panel">
          <div className="buy-point">
            <strong>Acceso seguro</strong>
            <span>
              Ingreso rapido para el equipo con autenticacion dedicada.
            </span>
          </div>
          <div className="buy-point">
            <strong>Lectura de ventas</strong>
            <span>
              Estados de orden y pagos visibles sin cambiar de modulo.
            </span>
          </div>
          <div className="buy-point">
            <strong>Base para escalar</strong>
            <span>
              La vista ya queda preparada para crecer con mas reportes.
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
      ) : (
        <div className="buy-form admin-dashboard">
          {data ? (
            <>
              <div className="summary">
                <strong>Rifa</strong>
                <span>{data.raffle.title}</span>
                <strong>Estado</strong>
                <span>{data.raffle.status}</span>
                <strong>Boletas</strong>
                <span>
                  {data.raffle.soldTickets}/{data.raffle.totalTickets}
                </span>
                <strong>Ingresos</strong>
                <span>
                  ${data.raffle.grossRevenueCop.toLocaleString("es-CO")} COP
                </span>
              </div>

              <div className="summary">
                <strong>Ordenes por estado</strong>
                {data.orderCounts.map((row) => (
                  <div key={row._id} className="admin-row">
                    {row._id}: {row.count}
                  </div>
                ))}
              </div>

              <div className="summary">
                <strong>Pagos por estado</strong>
                {data.paymentCounts.map((row) => (
                  <div key={row._id} className="admin-row">
                    {row._id}: {row.count}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>Cargando...</p>
          )}
        </div>
      )}
    </section>
  );
}
