import { Router } from "express";
import { getProfile, updatePassword, updateProfile } from "../services/personnel/personnel.service.js";
const router = Router();
router.get("/me", async (req, res, next) => {
  try { res.json(await getProfile(req.user.id)); } catch (error) { next(error); }
});
router.patch("/me", async (req, res, next) => {
  try { res.json({ success: true, profile: await updateProfile(req.user.id, req.body) }); } catch (error) { next(error); }
});
router.patch("/me/password", async (req, res, next) => {
  try { res.json(await updatePassword(req.user.id, req.body.password)); } catch (error) { next(error); }
});
export default router;
