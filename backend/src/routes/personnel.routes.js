import { Router } from "express";
import { getProfile } from "../services/personnel/personnel.service.js";
const router = Router();
router.get("/me", async (req, res, next) => {
  try {
    res.json(await getProfile(req.user.id));
  } catch (error) {
    next(error);
  }
});
export default router;
