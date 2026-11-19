export default function Sidebar({
  user,
  page = "chat",
  onNavigate = () => {},
  onLogout,
}) {
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
      <nav aria-label="Navegación principal">
        {[
          ["chat", "Chat"],
          ["profile", "Mi perfil"],
          ...(user?.rol === "RRHH" ? [["dashboard", "Dashboard"]] : []),
        ].map(([id, label]) => (
          <button
            key={id}
            className={"nav-item " + (page === id ? "active" : "")}
            onClick={() => onNavigate(id)}
            aria-current={page === id ? "page" : undefined}
          >
            {label}
          </button>
        ))}
      </nav>
      {user && (
        <footer className="sidebar-footer">
          <strong>{user.nombre}</strong>
          <small>{user.rol}</small>
          <button className="nav-item" onClick={onLogout}>
            Cerrar sesión
          </button>
        </footer>
      )}
    </aside>
  );
}
