import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api.js";
import "./RequestsReview.css";

const typeLabels = {
  vacaciones: "Vacaciones",
  permiso: "Permiso",
};

export default function RequestsReview() {
  const [status, setStatus] = useState("pendiente");
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState("");

  async function load() {
    setError("");
    const data = await api(`/requests?status=${status}`);
    setRequests(data.requests);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [status]);

  async function decide(id, nextStatus) {
    setBusyId(id);
    setError("");
    try {
      await api(`/requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      [r.nombre, r.departamento, r.tipo, r.estado]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [requests, search]);

  const pending = requests.filter((r) => r.estado === "pendiente").length;
  const approved = requests.filter((r) => r.estado === "aprobada").length;
  const rejected = requests.filter((r) => r.estado === "rechazada").length;

  return (
    <section className="workspace requests-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">SOLO RR. HH.</p>
          <h1>Revisión de permisos</h1>
          <p>Revisa las solicitudes de colaboradores y decide si se aprueban o se rechazan.</p>
        </div>
        <button className="primary refresh-button" onClick={() => load()} disabled={busyId !== null}>Actualizar</button>
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="request-metrics">
        <article className="request-metric pending"><span>Pendientes</span><strong>{pending}</strong><small>Requieren revisión</small></article>
        <article className="request-metric approved"><span>Aprobadas</span><strong>{approved}</strong><small>En el filtro actual</small></article>
        <article className="request-metric rejected"><span>Rechazadas</span><strong>{rejected}</strong><small>En el filtro actual</small></article>
      </div>

      <div className="request-toolbar">
        <div className="request-tabs">
          {[
            ["pendiente", "Pendientes"],
            ["aprobada", "Aprobadas"],
            ["rechazada", "Rechazadas"],
            ["todas", "Todas"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={status === value ? "active" : ""}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar colaborador o departamento..."
          aria-label="Buscar solicitudes"
        />
      </div>

      <div className="request-list">
        {filtered.map((r) => (
          <article className="request-card" key={r.id}>
            <div className="request-main">
              <div className="request-avatar">{r.nombre?.slice(0, 1).toUpperCase()}</div>
              <div>
                <h3>{r.nombre}</h3>
                <p>{r.puesto} · {r.departamento}</p>
                <div className="request-tags">
                  <span className="tag type">{typeLabels[r.tipo] || r.tipo}</span>
                  <span className={`tag status-${r.estado}`}>{r.estado}</span>
                </div>
              </div>
            </div>

            <div className="request-dates">
              <div><span>Desde</span><strong>{r.fecha_inicio}</strong></div>
              <div><span>Hasta</span><strong>{r.fecha_fin}</strong></div>
              <div><span>Duración</span><strong>{r.dias} {r.dias === 1 ? "día" : "días"}</strong></div>
            </div>

            <div className="request-actions">
              {r.estado === "pendiente" ? (
                <>
                  <button
                    className="approve"
                    disabled={busyId === r.id}
                    onClick={() => decide(r.id, "aprobada")}
                  >
                    Aprobar
                  </button>
                  <button
                    className="reject"
                    disabled={busyId === r.id}
                    onClick={() => decide(r.id, "rechazada")}
                  >
                    Rechazar
                  </button>
                </>
              ) : (
                <div className="reviewed">
                  <span>Revisada por</span>
                  <strong>{r.aprobador_nombre || "RR. HH."}</strong>
                </div>
              )}
            </div>
          </article>
        ))}

        {!filtered.length && (
          <div className="empty request-empty">
            <h2>No hay solicitudes</h2>
            <p>No se encontraron solicitudes con el filtro seleccionado.</p>
          </div>
        )}
      </div>
    </section>
  );
}
