import { Router } from "express";
import { query } from "../config/database.js";
import {
  hashPassword,
  verifyPassword,
  newToken,
  tokenHash,
} from "../services/auth/password.service.js";
import { authenticate, cookies } from "../middleware/auth.middleware.js";
const router = Router();
const attempts = new Map();
const dummyHash = hashPassword(newToken());
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 160 ||
      password.length > 200
    )
      return res
        .status(400)
        .json({ message: "Correo o contraseña inválidos." });
    const key = req.ip;
    const now = Date.now();
    const attempt = attempts.get(key);
    if (attempt && now - attempt.since < 900000 && attempt.count >= 10)
      return res
        .status(429)
        .json({ message: "Demasiados intentos. Intenta en 15 minutos." });
    if (!attempt || now - attempt.since >= 900000)
      attempts.set(key, { count: 0, since: now });
    attempts.get(key).count++;
    if (attempts.size > 10000)
      for (const [ip, item] of attempts)
        if (now - item.since >= 900000) attempts.delete(ip);
    const { rows } = await query(
      "SELECT id,password_hash,estado FROM colaboradores WHERE email=?",
      [email.trim().toLowerCase()],
    );
    const valid = verifyPassword(password, rows[0]?.password_hash || dummyHash);
    if (!valid || rows[0]?.estado !== "activo")
      return res
        .status(401)
        .json({ message: "Correo o contraseña incorrectos." });
    attempts.delete(key);
    const token = newToken(),
      csrf = newToken();
    await query("DELETE FROM sesiones WHERE expira_en<=UTC_TIMESTAMP()");
    await query(
      "INSERT INTO sesiones(token_hash,colaborador_id,csrf_token,expira_en) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))",
      [tokenHash(token), rows[0].id, csrf],
    );
    res.cookie("nuvexa_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 3600000,
      path: "/api",
    });
    res.json({ success: true, csrfToken: csrf });
  } catch (error) {
    next(error);
  }
});
router.get("/me", authenticate, (req, res) => {
  const { csrf_token, ...user } = req.user;
  res.json({
    user: { ...user, demoMode: process.env.LLM_PROVIDER === "mock" },
    csrfToken: csrf_token,
  });
});
router.post("/logout", authenticate, async (req, res, next) => {
  try {
    await query("DELETE FROM sesiones WHERE token_hash=?", [
      tokenHash(cookies(req).nuvexa_session),
    ]);
    res.clearCookie("nuvexa_session", {
      path: "/api",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
export default router;
