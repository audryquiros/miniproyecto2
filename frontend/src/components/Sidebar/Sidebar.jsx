export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">N</div>
        <div>
          <strong>Nuvexa</strong>
          <span>RR. HH.</span>
        </div>
      </div>

      <nav>
        <button className="nav-item active">Chat</button>
        <button className="nav-item" disabled>Mi perfil</button>
        <button className="nav-item" disabled>Dashboard</button>
      </nav>
    </aside>
  );
}
