import { useEffect, useState } from "react";
import { api, login, logout, resetConversation } from "./services/api.js";
import Sidebar from "./components/Sidebar/Sidebar.jsx";
import Chat from "./components/Chat/Chat.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import Profile from "./pages/Profile/Profile.jsx";
import "./pages/Chat/ChatPage.css";
import "./portal.css";
export default function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState("chat"),
    [error, setError] = useState("");
  useEffect(() => {
    api("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => {})
      .finally(() => setLoading(false));
    const expired = () => {
      setUser(null);
      resetConversation();
      setPage("chat");
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  async function signIn(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const data = await login(form.get("email"), form.get("password"));
      setUser(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function signOut() {
    try {
      await logout();
      setUser(null);
      setPage("chat");
    } catch (e) {
      setError(e.message);
    }
  }
  if (!user)
    return (
      <main className="login-shell">
        <section className="login-story">
          <div className="brand-mark">N</div>
          <p className="eyebrow">NUVEXA · RECURSOS HUMANOS</p>
          <h1>
            Tu información laboral,
            <br />
            en un solo lugar.
          </h1>
          <p>
            Consulta políticas con fuentes, revisa tus solicitudes y encuentra
            respuestas sobre tu trabajo.
          </p>
          <small>Entorno académico · Información de personal simulada</small>
        </section>
        <form className="login-form" onSubmit={signIn}>
          <h2>Bienvenido de nuevo</h2>
          <p>Accede con tu cuenta de Nuvexa.</p>
          <label>
            Correo de trabajo
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              placeholder="tu.cuenta@nuvexa.test"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={200}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={loading}>
            {loading ? "Comprobando sesión…" : "Iniciar sesión"}
          </button>
          <small>
            Las cuentas de demostración se crean con el comando de datos
            simulados. Consulta el README.
          </small>
        </form>
      </main>
    );
  return (
    <main className="app-shell">
      <Sidebar
        user={user}
        page={page}
        onNavigate={setPage}
        onLogout={signOut}
      />
      <div className="portal-content">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {page === "chat" ? (
          <Chat />
        ) : page === "profile" ? (
          <Profile />
        ) : user.rol === "RRHH" ? (
          <Dashboard demoMode={user.demoMode} />
        ) : null}
      </div>
    </main>
  );
}
