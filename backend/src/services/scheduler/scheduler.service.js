import { today, TIME_ZONE } from "../../utils/dates.js";
import { query } from "../../config/database.js";
import { buildReport } from "../reports/report.service.js";
import { syncPoliciesFromDrive } from "../drive/drive.ingestion.service.js";
export function startScheduler() {
  if (process.env.SCHEDULER_ENABLED !== "true") return () => {};
  let busy = false;
  async function tick() {
    if (busy) return;
    busy = true;
    try {
      const day = today();
      const hour = +new Intl.DateTimeFormat("en-GB", {
        timeZone: TIME_ZONE,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date());
      const tasks = [];
      if (hour >= 6 && process.env.GOOGLE_DRIVE_FOLDER_ID)
        tasks.push(["drive", syncPoliciesFromDrive]);
      if (hour >= 7) tasks.push(["reporte", () => buildReport(day)]);
      for (const [task, run] of tasks) {
        const { rows } = await query(
          "SELECT completada_en FROM ejecuciones_programadas WHERE tarea=? AND fecha=?",
          [task, day],
        );
        if (rows[0]?.completada_en) continue;
        try {
          await run();
          await query(
            "INSERT INTO ejecuciones_programadas(tarea,fecha,completada_en) VALUES (?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE completada_en=UTC_TIMESTAMP()",
            [task, day],
          );
        } catch (error) {
          console.error({ task, code: error.code || error.name });
        }
      }
    } catch (error) {
      console.error({ scheduler: "failed", code: error.code || error.name });
    } finally {
      busy = false;
    }
  }
  const timer = setInterval(tick, 60000);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}
