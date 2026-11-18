import { pool } from "../src/config/database.js";
import { hashPassword } from "../src/services/auth/password.service.js";
import { today, shiftDate, monthStart } from "../src/utils/dates.js";
const password = process.env.SEED_PASSWORD;
if (!password || password.length < 12)
  throw new Error(
    "Define SEED_PASSWORD con al menos 12 caracteres. Solo se crean datos ficticios.",
  );
const c = await pool.getConnection();
try {
  const [[{ total }]] = await c.query(
    "SELECT COUNT(*) total FROM colaboradores",
  );
  if (total)
    throw new Error(
      "La base ya contiene colaboradores. El seed no sobrescribe información existente.",
    );
  await c.beginTransaction();
  const day = today();
  const departments = [
    "Tecnología",
    "Operaciones",
    "Ventas",
    "Finanzas",
    "Recursos Humanos",
  ];
  const passwordHash = hashPassword(password);
  for (let i = 1; i <= 250; i++) {
    const role = i <= 2 ? "RRHH" : "colaborador";
    const inactive = i >= 246;
    const joined = shiftDate(day, i > 235 ? -(250 - i) * 3 : -365 - i);
    const exited = inactive ? shiftDate(day, -(250 - i) * 2) : null;
    await c.execute(
      `INSERT INTO colaboradores (id,nombre,email,password_hash,departamento,puesto,fecha_ingreso,jefe_id,rol,estado,proxima_evaluacion)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        i,
        `Colaborador Simulado ${String(i).padStart(3, "0")}`,
        i === 1
          ? "rrhh@nuvexa.test"
          : i === 3
            ? "colaborador@nuvexa.test"
            : `persona${i}@nuvexa.test`,
        passwordHash,
        departments[(i - 1) % 5],
        i <= 5 ? "Coordinación" : "Especialista",
        shiftDate(day, i > 235 ? -(250 - i) * 3 : -365 - i),
        i <= 5 ? null : (i % 5) + 1,
        role,
        inactive ? "inactivo" : "activo",
        shiftDate(day, 10 + (i % 80)),
      ],
    );
    const assigned = 15 + (i % 18),
      used = i % 10;
    await c.execute("INSERT INTO saldos_vacaciones VALUES (?,?,?,?,?)", [
      i,
      +day.slice(0, 4),
      assigned,
      used,
      assigned - used,
    ]);
    await c.execute(
      "INSERT INTO movimientos_personal(colaborador_id,tipo,fecha,motivo) VALUES (?,?,?,?)",
      [
        i,
        "ingreso",
        shiftDate(day, i > 235 ? -(250 - i) * 3 : -365 - i),
        "Ingreso simulado",
      ],
    );
    if (inactive)
      await c.execute(
        "INSERT INTO movimientos_personal(colaborador_id,tipo,fecha,motivo) VALUES (?,?,?,?)",
        [i, "salida", shiftDate(day, -(250 - i) * 2), "Salida simulada"],
      );
    for (let month = 0; month < 3; month++) {
      const offset = month * 30 + (i % 25);
      const start = shiftDate(day, -offset),
        end = shiftDate(start, 1 + (i % 4));
      if (start < joined || (exited && end >= exited)) continue;
      const status =
        month === 0 && i % 4 === 0
          ? "pendiente"
          : i % 9 === 0
            ? "rechazada"
            : "aprobada";
      await c.execute(
        `INSERT INTO solicitudes(colaborador_id,tipo,fecha_inicio,fecha_fin,estado,aprobador_id,creada_en) VALUES (?,?,?,?,?,?,?)`,
        [
          i,
          i % 3 === 0 ? "permiso" : "vacaciones",
          start,
          end,
          status,
          i <= 5 ? 1 : (i % 5) + 1,
          `${shiftDate(start, -10)} 09:00:00`,
        ],
      );
      if (i % 7 === 0)
        await c.execute(
          "INSERT INTO incapacidades(colaborador_id,tipo,fecha_inicio,dias,entidad) VALUES (?,?,?,?,?)",
          [i, "enfermedad", start, 3 + (i % 5), "CCSS (simulado)"],
        );
      if (i % 17 === 0)
        await c.execute(
          "INSERT INTO movimientos_personal(colaborador_id,tipo,fecha,motivo) VALUES (?,?,?,?)",
          [i, "ascenso", start, "Ascenso simulado"],
        );
    }
  }
  for (let n = -90; n <= 90; n++) {
    const date = shiftDate(day, n);
    const d = +date.slice(8);
    const tomorrow = shiftDate(date, 1);
    if (d === 15 || tomorrow.slice(5, 7) !== date.slice(5, 7)) {
      let payment = date;
      while ([0, 6].includes(new Date(payment + "T12:00:00Z").getUTCDay()))
        payment = shiftDate(payment, -1);
      await c.execute("INSERT IGNORE INTO calendario_pagos VALUES (?,?)", [
        payment,
        "Planilla quincenal simulada; calendario académico sin ajustes por feriados",
      ]);
    }
  }
  await c.commit();
  console.log(
    `250 colaboradores ficticios y 3 meses de movimientos creados. Fecha de referencia: ${day}. Inicio del mes: ${monthStart(day)}.`,
  );
} catch (error) {
  await c.rollback();
  throw error;
} finally {
  c.release();
  await pool.end();
}
