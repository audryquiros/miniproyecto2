import { Router } from "express";
import { requireHR } from "../middleware/auth.middleware.js";
import {
  getTodayAttendance,
  checkIn,
  checkOut,
  listMyAttendance,
  listHRAlerts,
  reviewAlert,
  applySanction,
  listSanctions,
  editAttendance,
  revokeSanction,
} from "../services/attendance/attendance.service.js";

const router = Router();
router.get("/me/today", async (req, res, next) => { try { res.json(await getTodayAttendance(req.user.id)); } catch (error) { next(error); } });
router.get("/me", async (req, res, next) => { try { res.json({ attendance: await listMyAttendance(req.user.id) }); } catch (error) { next(error); } });
router.post("/check-in", async (req, res, next) => { try { res.status(201).json(await checkIn(req.user.id)); } catch (error) { next(error); } });
router.post("/check-out", async (req, res, next) => { try { res.json(await checkOut(req.user.id)); } catch (error) { next(error); } });
router.get("/alerts", requireHR, async (req, res, next) => { try { res.json({ alerts: await listHRAlerts({ status: req.query.status || "pendiente" }) }); } catch (error) { next(error); } });
router.patch("/alerts/:id/review", requireHR, async (req, res, next) => { try { res.json(await reviewAlert(req.user.id, Number(req.params.id))); } catch (error) { next(error); } });
router.get("/sanctions", requireHR, async (req, res, next) => { try { res.json({ sanctions: await listSanctions() }); } catch (error) { next(error); } });
router.post("/sanctions", requireHR, async (req, res, next) => { try { res.status(201).json(await applySanction(req.user.id, req.body)); } catch (error) { next(error); } });
router.patch("/sanctions/:id/revoke", requireHR, async (req, res, next) => { try { res.json(await revokeSanction(req.user.id, Number(req.params.id), req.body.reason)); } catch (error) { next(error); } });
router.patch("/:id/edit", requireHR, async (req, res, next) => { try { res.json({ success: true, attendance: await editAttendance(req.user.id, Number(req.params.id), req.body) }); } catch (error) { next(error); } });
export default router;
