import { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { CalendarCheck2, ClipboardCheck, LayoutDashboard, LogOut, UserRound } from "lucide-react";

export default function Sidebar({
  user,
  page = "chat",
  onNavigate = () => {},
  onLogout,
}) {
  const [pendingAlerts, setPendingAlerts] = useState(0);

  useEffect(() => {
    if (user?.rol !== "RRHH") return;
    let active = true;
    const load = () =>
      api("/attendance/alerts?status=pendiente")
        .then((data) => { if (active) setPendingAlerts(data.alerts.length); })
        .catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    return () => { active = false; clearInterval(timer); };
  }, [user?.rol]);

  const items = user?.rol === "RRHH"
    ? [
        ["dashboard", "Dashboard", LayoutDashboard],
        ["requests-review", "Revisión de permisos", ClipboardCheck],
        ["hr-attendance", `Asistencia e incidencias${pendingAlerts ? ` (${pendingAlerts})` : ""}`, CalendarCheck2],
        ["profile", "Mi perfil", UserRound],
      ]
    : [
        ["attendance", "Asistencia", CalendarCheck2],
        ["profile", "Mi perfil", UserRound],
      ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">N</div>
        <div>
          <strong>Nuvexa</strong>
          <span>RR. HH.</span>
        </div>
      </div>
      {user?.demoMode && (
        <p className="demo-label">Demostración · fuentes locales</p>
      )}
      <nav className="sidebar-nav" aria-label="Navegación principal">
        {items.map(([id, label, Icon]) => (
          <button key={id} className={"nav-item " + (page === id ? "active" : "")} onClick={() => onNavigate(id)} aria-current={page === id ? "page" : undefined}>
            <Icon size={17} strokeWidth={1.9} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {user && (
        <footer className="sidebar-footer">
          <strong>{user.nombre}</strong>
          <small>{user.rol}</small>
          <button className="nav-item logout-item" onClick={onLogout}>
            <LogOut size={17} strokeWidth={1.9} />
            <span>Cerrar sesión</span>
          </button>
        </footer>
      )}
    </aside>
  );
}
