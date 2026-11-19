import { query } from "../config/database.js";
import { tokenHash } from "../services/auth/password.service.js";
export function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .filter(Boolean)
      .map((value) => {
        const i = value.indexOf("=");
        return [value.slice(0, i).trim(), value.slice(i + 1).trim()];
      }),
  );
}
export async function authenticate(req, res, next) {
  try {
    const token = cookies(req).nuvexa_session;
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      return res.status(401).json({ message: "Inicia sesión para continuar." });
    const { rows } = await query(
      `SELECT c.id,c.nombre,c.email,c.departamento,c.puesto,c.rol,s.csrf_token
      FROM sesiones s JOIN colaboradores c ON c.id=s.colaborador_id
      WHERE s.token_hash=? AND s.expira_en>UTC_TIMESTAMP() AND c.estado='activo'`,
      [tokenHash(token)],
    );
    if (!rows.length)
      return res
        .status(401)
        .json({ message: "Tu sesión expiró. Inicia sesión nuevamente." });
    req.user = rows[0];
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers["x-csrf-token"] !== req.user.csrf_token
    )
      return res.status(403).json({ message: "Token de seguridad inválido." });
    next();
  } catch (error) {
    next(error);
  }
}
export function requireHR(req, res, next) {
  if (req.user?.rol !== "RRHH")
    return res
      .status(403)
      .json({ message: "Este recurso requiere el rol RRHH." });
  next();
}
