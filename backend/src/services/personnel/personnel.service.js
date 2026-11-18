import { query } from "../../config/database.js";
import { today } from "../../utils/dates.js";
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
      "SELECT id,tipo,fecha_inicio,fecha_fin,estado,creada_en FROM solicitudes WHERE colaborador_id=? ORDER BY creada_en DESC LIMIT 30",
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
