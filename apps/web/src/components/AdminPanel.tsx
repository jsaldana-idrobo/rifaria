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
    <section className="buy-card glass-card" style={{ marginTop: "36px" }}>
      <div>
        <p className="pill">Admin</p>
        <h1
          className="brand-title"
          style={{ fontSize: "3.3rem", margin: "10px 0" }}
        >
          Panel Operativo
        </h1>
        <p>
          Visualiza ventas, pagos y avance de la rifa. Esta vista es MVP y quedo
          lista para conectarse al backend productivo.
        </p>
      </div>

      {!token ? (
        <form className="buy-form" onSubmit={login}>
          <label>
            Correo admin
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Password
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
        <div className="buy-form">
          {data ? (
            <>
              <div className="summary">
                <strong>Rifa:</strong> {data.raffle.title}
                <strong>Estado:</strong> {data.raffle.status}
                <strong>Boletas:</strong> {data.raffle.soldTickets}/
                {data.raffle.totalTickets}
                <strong>Ingresos:</strong> $
                {data.raffle.grossRevenueCop.toLocaleString("es-CO")} COP
              </div>

              <div className="summary">
                <strong>Ordenes por estado</strong>
                {data.orderCounts.map((row) => (
                  <div key={row._id}>
                    {row._id}: {row.count}
                  </div>
                ))}
              </div>

              <div className="summary">
                <strong>Pagos por estado</strong>
                {data.paymentCounts.map((row) => (
                  <div key={row._id}>
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
