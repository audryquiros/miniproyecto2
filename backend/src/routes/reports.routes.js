import { Router } from "express";
import {
  listReports,
  getReport,
  buildReport,
} from "../services/reports/report.service.js";
import { today } from "../utils/dates.js";
const router = Router();
router.get("/", async (_req, res, next) => {
  try {
    res.json({ reports: await listReports() });
  } catch (error) {
    next(error);
  }
});
router.get("/:date", async (req, res, next) => {
  try {
    const report = await getReport(req.params.date);
    if (!report)
      return res
        .status(404)
        .json({ message: "No hay un reporte publicado para esta fecha." });
    res.json(report);
  } catch (error) {
    next(error);
  }
});
router.post("/generate", async (_req, res, next) => {
  try {
    res.json(await buildReport(today()));
  } catch (error) {
    next(error);
  }
});
export default router;
