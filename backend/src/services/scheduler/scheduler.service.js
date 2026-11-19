import { today, TIME_ZONE } from "../../utils/dates.js";
import { query } from "../../config/database.js";
import { buildReport } from "../reports/report.service.js";
import { syncPoliciesFromDrive } from "../drive/drive.ingestion.service.js";
import { closeOpenAttendanceAlerts } from "../attendance/attendance.service.js";
export function createScheduler({
  dbQuery = query,
  runReport = buildReport,
  runDrive = syncPoliciesFromDrive,
  runAttendance = closeOpenAttendanceAlerts,
  now = () => new Date(),
  hasDrive = () => !!process.env.GOOGLE_DRIVE_FOLDER_ID,
} = {}) {
  const busy = new Set();
  async function execute(task, run, day) {
    if (busy.has(task)) return;
    busy.add(task);
    try {
      const { rows } = await dbQuery(
        "SELECT completada_en FROM ejecuciones_programadas WHERE tarea=? AND fecha=?",
        [task, day],
      );
      if (rows[0]?.completada_en) return;
      await run();
      await dbQuery(
        "INSERT INTO ejecuciones_programadas(tarea,fecha,completada_en) VALUES (?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE completada_en=UTC_TIMESTAMP()",
        [task, day],
      );
    } catch (error) {
      console.error({ task, code: error.code || error.name });
    } finally {
      busy.delete(task);
    }
  }
  async function tick() {
    try {
      const instant = now();
      const day = today(instant);
      const hour = +new Intl.DateTimeFormat("en-GB", {
        timeZone: TIME_ZONE,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(instant);
      const tasks = [];
      if (hour >= 7) tasks.push(execute("reporte", () => runReport(day), day));
      if (hour >= 6 && hasDrive()) tasks.push(execute("drive", runDrive, day));
      if (hour >= 18) tasks.push(execute("attendance", () => runAttendance(day), day));
      await Promise.all(tasks);
    } catch (error) {
      console.error({ scheduler: "failed", code: error.code || error.name });
    }
  }
  return { tick };
}
export function startScheduler() {
  if (process.env.SCHEDULER_ENABLED !== "true") return () => {};
  const { tick } = createScheduler();
  const timer = setInterval(tick, 60000);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}
