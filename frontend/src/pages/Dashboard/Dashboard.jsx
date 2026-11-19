import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, FileCheck2, Users } from "lucide-react";
import { api } from "../../services/api.js";

function Trend({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.ausentes));
  const points = rows.map((r, i) => [42 + (i * 500) / Math.max(1, rows.length - 1), 150 - (r.ausentes / max) * 110]);
  return (
    <figure className="dash-card chart-card">
      <div className="card-title">
        <div><span className="eyebrow">TENDENCIA</span><h2>Personas ausentes</h2></div>
        <span className="chart-period">Últimos 30 días</span>
      </div>
      <svg viewBox="0 0 570 190" role="img" aria-label="Tendencia de personas ausentes">
        <line x1="42" y1="150" x2="542" y2="150" stroke="currentColor" opacity=".18" />
        <line x1="42" y1="40" x2="42" y2="150" stroke="currentColor" opacity=".18" />
        <polyline fill="none" stroke="#5b7cff" strokeWidth="3" points={points.map((p) => p.join(",")).join(" ")} />
        {points.filter((_, i) => i % 5 === 0 || i === points.length - 1).map(([x, y], i) => {
          const row = rows[Math.min(i * 5, rows.length - 1)];
          return <circle key={i} cx={x} cy={y} r="3.5" fill="#5b7cff"><title>{row?.fecha}: {row?.ausentes} personas</title></circle>;
        })}
        <text x="42" y="176">{rows[0]?.fecha}</text>
        <text x="465" y="176">{rows.at(-1)?.fecha}</text>
      </svg>
      <small>Personas con ausencia aprobada o incapacidad activa.</small>
    </figure>
  );
}

function AbsenceChart({ rows }) {
  const types = ["vacaciones", "permiso", "incapacidad"];
  const labels = { vacaciones: "Vacaciones", permiso: "Permisos", incapacidad: "Incapacidades" };
  const totals = types.map((tipo) => ({ tipo, total: rows.filter((r) => r.tipo === tipo).reduce((n, r) => n + Number(r.total), 0) }));
  const max = Math.max(1, ...totals.map((r) => r.total));
  return (
    <figure className="dash-card chart-card">
      <div className="card-title">
        <div><span className="eyebrow">DISTRIBUCIÓN</span><h2>Ausencias por tipo</h2></div>
      </div>
      <div className="bars">
        {totals.map((r) => (
          <div className="bar-row" key={r.tipo}>
            <span>{labels[r.tipo]}</span>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${(350 * r.total) / max}px` }} /></div>
            <strong>{r.total}</strong>
          </div>
        ))}
      </div>
      <small>Personas registradas por tipo de ausencia.</small>
    </figure>
  );
}

function RequestMixChart({ rows }) {
  const values = [
    { key: "vacaciones", label: "Vacaciones" },
    { key: "permiso", label: "Permisos" },
  ].map((item) => ({ ...item, total: rows.filter((r) => r.tipo === item.key).length }));
  const max = Math.max(1, ...values.map((v) => v.total));
  return <figure className="dash-card chart-card mini-chart"><div className="card-title"><div><span className="eyebrow">SOLICITUDES</span><h2>Lo que espera revisión</h2></div></div><div className="bars">{values.map(v => <div className="bar-row" key={v.key}><span>{v.label}</span><div className="bar-track"><div className="bar-fill bar-blue" style={{width:`${(100*v.total)/max}%`}} /></div><strong>{v.total}</strong></div>)}</div><small>Distribución de solicitudes pendientes.</small></figure>;
}

function MovementChart({ rows }) {
  const values = [
    { key: "ingreso", label: "Ingresos", icon: "↗" },
    { key: "salida", label: "Salidas", icon: "↘" },
    { key: "ascenso", label: "Ascensos", icon: "↑" },
  ].map(item => ({...item,total:Number(rows.find(r=>r.tipo===item.key)?.total||0)}));
  const max = Math.max(1,...values.map(v=>v.total));
  return <figure className="dash-card chart-card mini-chart"><div className="card-title"><div><span className="eyebrow">MOVIMIENTO</span><h2>Movimientos del mes</h2></div></div><div className="movement-bars">{values.map(v=><div className="movement-item" key={v.key}><div className="movement-icon">{v.icon}</div><div><strong>{v.total}</strong><span>{v.label}</span></div><div className="movement-track"><div style={{height:`${Math.max(8,(70*v.total)/max)}px`}} /></div></div>)}</div><small>Ingresos, salidas y ascensos registrados.</small></figure>;
}

export default function Dashboard({ demoMode = false }) {
  const [dates, setDates] = useState([]), [date, setDate] = useState(""),
    [report, setReport] = useState(null), [error, setError] = useState(""),
    [busy, setBusy] = useState(false), [attendanceAlerts, setAttendanceAlerts] = useState([]);

  async function loadDates() {
    const data = await api("/reports");
    setDates(data.reports);
    if (data.reports.length) setDate((previous) => previous || data.reports[0].fecha);
  }

  async function loadAttendanceAlerts() {
    try {
      const data = await api("/attendance/alerts?status=pendiente");
      setAttendanceAlerts(data.alerts || []);
    } catch {
      setAttendanceAlerts([]);
    }
  }

  useEffect(() => { loadDates().catch((e) => setError(e.message)); loadAttendanceAlerts(); }, []);

  useEffect(() => {
    if (!date) return;
    let active = true;
    setBusy(true); setError("");
    api("/reports/" + date).then((r) => { if (active) setReport(r); })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [date]);

  async function generate() {
    setBusy(true); setError("");
    try { const r = await api("/reports/generate", { method: "POST" }); setReport(r); setDate(r.fecha); await loadDates(); await loadAttendanceAlerts(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function sync() {
    setBusy(true); setError("");
    try { const r = await api("/ingestion/drive/sync", { method: "POST" }); setError("Sincronización completada: " + r.totalFiles + " archivos revisados."); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  function go(page) { window.dispatchEvent(new CustomEvent("navigate-page", { detail: page })); }

  const d = report?.datos_json;
  const pending = d?.pendientes_total || 0;
  const absence = d?.ausentes_total || 0;
  const medical = d?.incapacidades?.activas || 0;
  const turnover = d?.rotacion_porcentaje || 0;
  const incompleteHours = attendanceAlerts.filter((a) => a.tipo === "horas_insuficientes").length;
  const noExit = attendanceAlerts.filter((a) => a.tipo === "sin_salida").length;
  const noMark = attendanceAlerts.filter((a) => a.tipo === "sin_marcacion").length;

  return (
    <section className="workspace dashboard-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">RR. HH. · RESUMEN</p>
          <h1>Panorama del equipo</h1>
          <p>Lo importante de hoy, sin tener que revisar todos los datos.</p>
        </div>
        <div className="toolbar">
          <label>Fecha<select value={date} onChange={(e) => setDate(e.target.value)} disabled={busy || !dates.length}>{dates.map((r) => <option key={r.fecha}>{r.fecha}</option>)}</select></label>
          <button className="primary" onClick={generate} disabled={busy}>Actualizar reporte</button>
          {!demoMode && <button onClick={sync} disabled={busy}>Sincronizar Drive</button>}
        </div>
      </header>

      {error && <p className="notice" role="status">{error}</p>}
      {busy && <p role="status">Actualizando información…</p>}

      {!d && !busy ? (
        <div className="empty"><h2>Aún no hay reportes publicados</h2><p>Genera el reporte de hoy para comenzar.</p></div>
      ) : d && (
        <>
          <div className="dashboard-hero">
            <div><span className="eyebrow">RESUMEN DE HOY</span><h2>{report.resumen_texto}</h2><p>Usa las tarjetas y acciones de abajo para ir directamente a lo que necesita atención.</p></div>
            <div className="hero-date">{report.fecha}</div>
          </div>

          <div className="metrics dashboard-metrics">
            <article><span>Personas ausentes</span><strong>{absence}</strong><small>{d.colaboradores_activos} colaboradores activos</small></article>
            <article className={pending ? "attention" : ""}><span>Solicitudes por revisar</span><strong>{pending}</strong><small>{d.pendientes_mas_3_dias} llevan más de 3 días</small></article>
            <article><span>Incapacidades activas</span><strong>{medical}</strong><small>{d.incapacidades.dias_mes} días acumulados este mes</small></article>
            <article className={attendanceAlerts.length ? "attention" : "ok-card"}><span>Alertas de asistencia</span><strong>{attendanceAlerts.length}</strong><small>{incompleteHours} horas insuficientes · {noExit} sin salida</small></article>
          </div>

          <section className="attention-panel">
            <div className="attention-panel-title"><span className="eyebrow">CENTRO DE ATENCIÓN</span><h2>¿Qué necesita revisión?</h2><p>Estas son las acciones que RR. HH. puede atender ahora.</p></div>
            <div className="attention-actions">
              <button onClick={() => go("requests-review")} className={pending ? "action-card action-warning" : "action-card action-ok"}>
                <span className="action-icon"><FileCheck2 size={19} /></span><span><strong>{pending} solicitudes</strong><small>Revisar permisos y vacaciones</small></span><span className="action-arrow">→</span>
              </button>
              <button onClick={() => go("hr-attendance")} className={attendanceAlerts.length ? "action-card action-warning" : "action-card action-ok"}>
                <span className="action-icon"><Clock3 size={19} /></span><span><strong>{attendanceAlerts.length} alertas</strong><small>Revisar asistencia y marcaciones</small></span><span className="action-arrow">→</span>
              </button>
            </div>
          </section>

          <div className="charts dashboard-charts"><Trend rows={d.tendencia_30_dias} /><AbsenceChart rows={d.ausencias} /><RequestMixChart rows={d.solicitudes_pendientes} /><MovementChart rows={d.movimientos} /></div>

          <section className="dash-card pending-card">
            <div className="card-title"><div><span className="eyebrow">SOLICITUDES</span><h2>Lo que está esperando revisión</h2></div><button className="text-button" onClick={() => go("requests-review")}>Ver todas →</button></div>
            {d.solicitudes_pendientes.length ? <div className="mini-request-list">{d.solicitudes_pendientes.slice(0, 5).map((r) => <div key={r.id} className="mini-request"><div><strong>{r.nombre}</strong><span>{r.departamento} · {r.tipo}</span></div><div><span>Desde</span><strong>{r.fecha_inicio}</strong></div><span className="badge pendiente">{r.dias_espera} días esperando</span></div>)}</div> : <p>No hay solicitudes pendientes.</p>}
          </section>

          <section className="dash-card attendance-preview">
            <div className="card-title"><div><span className="eyebrow">ASISTENCIA</span><h2>Alertas que requieren revisión</h2></div><button className="text-button" onClick={() => go("hr-attendance")}>Ver asistencia →</button></div>
            {attendanceAlerts.length ? <div className="attendance-summary-grid">
              <div><strong>{incompleteHours}</strong><span>Horas insuficientes</span></div>
              <div><strong>{noExit}</strong><span>Sin hora de salida</span></div>
              <div><strong>{noMark}</strong><span>Sin marcación</span></div>
              <div><strong>{attendanceAlerts.length}</strong><span>Total por revisar</span></div>
            </div> : <div className="clean-state"><CheckCircle2 size={20} /><span>No hay alertas pendientes de asistencia.</span></div>}
          </section>

          <div className="dashboard-lower">
            <section className="dash-card compact-card"><span className="eyebrow">VACACIONES</span><h2>Saldos altos</h2><div className="big-stat">{d.vacaciones_riesgo_total}</div><p>personas con más de 20 días disponibles.</p><button className="text-button" onClick={() => go("requests-review")}>Revisar solicitudes →</button></section>
            <section className="dash-card compact-card"><span className="eyebrow">ROTACIÓN</span><h2>Movimiento del mes</h2><div className="big-stat">{turnover}%</div><p>{d.movimientos.find((r) => r.tipo === "salida")?.total || 0} salidas registradas en el período.</p></section>
          </div>

          <details className="report-details">
            <summary>Cómo se calculan estos indicadores</summary>
            <div className="definition-grid">
              <div><Users size={18} /><strong>Personas ausentes</strong><p>Colaboradores con una ausencia aprobada o una incapacidad activa en la fecha del reporte.</p></div>
              <div><FileCheck2 size={18} /><strong>Solicitudes por revisar</strong><p>Solicitudes que todavía están pendientes de aprobación o rechazo por RR. HH.</p></div>
              <div><Clock3 size={18} /><strong>Alertas de asistencia</strong><p>Marcaciones que requieren revisión, como horas insuficientes, falta de salida o falta de registro.</p></div>
              <div><CalendarClock size={18} /><strong>Rotación mensual</strong><p>Salidas registradas en relación con el promedio de colaboradores del período.</p></div>
            </div>
            <p className="report-note">Los datos detallados y los cálculos del reporte permanecen disponibles aquí sin ocupar la vista principal.</p>
          </details>
        </>
      )}
    </section>
  );
}
