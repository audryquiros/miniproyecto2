import { Router } from "express";
import { syncDrive } from "../controllers/ingestion.controller.js";

const router = Router();

router.post("/drive/sync", syncDrive);

export default router;
