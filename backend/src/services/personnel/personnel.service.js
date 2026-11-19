import { query } from "../../config/database.js";
import { today } from "../../utils/dates.js";
import { hashPassword } from "../auth/password.service.js";

export async function getProfile(userId) {
  const day = today();
  const [profile, balance, requests, payment] = await Promise.all([
    query(
      "SELECT id,nombre,email,departamento,puesto,fecha_ingreso,proxima_evaluacion FROM colaboradores WHERE id=?",
      [userId],
    ),
    query(
      "SELECT periodo,dias_asignados,dias_tomados,dias_disponibles FROM saldos_vacaciones WHERE colaborador_id=? ORDER BY periodo DESC",
      [userId],
    ),
    query(
      "SELECT id,tipo,fecha_inicio,fecha_fin,estado,creada_en FROM solicitudes WHERE colaborador_id=? ORDER BY creada_en DESC",
      [userId],
    ),
    query(
      "SELECT fecha,concepto FROM calendario_pagos WHERE fecha>=? ORDER BY fecha LIMIT 1",
      [day],
    ),
  ]);
  return {
    ...profile.rows[0],
    saldos: balance.rows,
    solicitudes: requests.rows,
    proximo_pago: payment.rows[0] || null,
  };
}

export async function updateProfile(userId, { nombre, email }) {
  const cleanName = String(nombre || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (cleanName.length < 3 || cleanName.length > 120) {
    throw Object.assign(new Error("El nombre debe tener entre 3 y 120 caracteres."), { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 160) {
    throw Object.assign(new Error("Ingresa un correo válido."), { status: 400 });
  }
  const duplicate = await query("SELECT id FROM colaboradores WHERE email=? AND id<>? LIMIT 1", [cleanEmail, userId]);
  if (duplicate.rows.length) throw Object.assign(new Error("Ese correo ya está asociado a otra cuenta."), { status: 409 });
  await query("UPDATE colaboradores SET nombre=?,email=? WHERE id=?", [cleanName, cleanEmail, userId]);
  return getProfile(userId);
}

export async function updatePassword(userId, password) {
  const value = String(password || "");
  if (value.length < 12 || value.length > 200) {
    throw Object.assign(new Error("La contraseña debe tener entre 12 y 200 caracteres."), { status: 400 });
  }
  await query("UPDATE colaboradores SET password_hash=? WHERE id=?", [hashPassword(value), userId]);
  return { success: true };
}
