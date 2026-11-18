import { buildReport } from "../src/services/reports/report.service.js";
import { pool } from "../src/config/database.js";
try {
  const report = await buildReport();
  console.log(`Reporte publicado para ${report.fecha}.`);
} finally {
  await pool.end();
}
