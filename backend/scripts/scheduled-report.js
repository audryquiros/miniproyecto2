import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import {
  buildReport,
  getReport,
} from "../src/services/reports/report.service.js";
import { pool } from "../src/config/database.js";
import { today, TIME_ZONE } from "../src/utils/dates.js";

const started = new Date();
const day = today(started);
const localTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
}).format(started);
const manual = process.argv.includes("--check-now");
const evidence = {
  startedAt: started.toISOString(),
  timezone: TIME_ZONE,
  localTime,
  date: day,
  trigger: manual ? "manual-check" : "windows-scheduler",
  observedAtSeven: !manual && localTime === "07:00",
  success: false,
};
try {
  if (!manual && localTime < "07:00")
    throw new Error("No se publica antes de las 07:00 de Costa Rica.");
  evidence.reusedExistingReport = !!(await getReport(day));
  const report = await buildReport(day);
  evidence.success = true;
  evidence.reportDate = report.fecha;
  evidence.reportCreatedAt = report.creado_en;
  evidence.provider = report.generado_por;
  console.log(JSON.stringify(evidence));
} catch (error) {
  evidence.error = error.code || error.message;
  process.exitCode = 1;
  console.error("No se completó el reporte programado:", evidence.error);
} finally {
  await mkdir(".cache/scheduler", { recursive: true });
  await writeFile(
    `.cache/scheduler/${day}-${manual ? "manual" : "scheduled"}.json`,
    JSON.stringify(evidence, null, 2),
  );
  await pool.end();
}
