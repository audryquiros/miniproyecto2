import { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import "./Attendance.css";

function formatTime(value) {
  if (!value) return "—";
  return new Date(value.replace(" ", "T") + "Z").toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Attendance() {
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [current, past] = await Promise.all([
      api("/attendance/me/today"),
      api("/attendance/me"),
    ]);
    setToday(current);
    setHistory(past.attendance);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function mark(action) {
    setBusy(true);
    setError("");
    try {
      await api(`/attendance/${action}`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const record = today?.asistencia;
  const canIn = !record?.hora_entrada;
  const canOut = !!record?.hora_entrada && !record?.hora_salida;

  return (
    <section className="workspace attendance-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">CONTROL DE ASISTENCIA</p>
          <h1>Mi jornada</h1>
          <p>Registra tu entrada y salida desde el portal de Nuvexa.</p>
        </div>
        <div className="attendance-actions">
          <button className="primary" onClick={() => mark("check-in")} disabled={busy || !canIn}>
            Registrar entrada
          </button>
          <button onClick={() => mark("check-out")} disabled={busy || !canOut}>
            Registrar salida
          </button>
        </div>
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="attendance-summary">
        <article>
          <span>Fecha</span>
          <strong>{today?.fecha || "—"}</strong>
        </article>
        <article>
          <span>Entrada</span>
          <strong>{formatTime(record?.hora_entrada)}</strong>
        </article>
        <article>
          <span>Salida</span>
          <strong>{formatTime(record?.hora_salida)}</strong>
        </article>
        <article>
          <span>Horas registradas</span>
          <strong>{record?.horas_trabajadas != null ? `${record.horas_trabajadas} h` : "—"}</strong>
          <small>Mínimo de referencia: {today?.minimo_horas ?? 8} h</small>
        </article>
      </div>

      {record?.estado === "incidencia" && (
        <div className="attendance-alert">
          <strong>Atención:</strong> tu registro de hoy quedó marcado como incidencia porque no alcanzó el mínimo configurado o quedó incompleto. Si hubo una situación justificada, comunícala a tu jefatura/RR. HH.
        </div>
      )}

      <h2>Historial de asistencia</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th>Horas</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id}>
                <td>{row.fecha}</td>
                <td>{formatTime(row.hora_entrada)}</td>
                <td>{formatTime(row.hora_salida)}</td>
                <td>{row.horas_trabajadas != null ? `${row.horas_trabajadas} h` : "—"}</td>
                <td><span className={`badge ${row.estado === "completa" ? "aprobada" : row.estado === "incidencia" ? "rechazada" : "pendiente"}`}>{row.estado}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!history.length && <p>No tienes registros de asistencia todavía.</p>}
      </div>
    </section>
  );
}
