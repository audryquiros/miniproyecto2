import { Router } from "express";
import { listRequests, updateRequestStatus } from "../services/requests/requests.service.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    res.json({ success: true, requests: await listRequests(req.query.status || "pendiente") });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId) || requestId < 1) {
      throw Object.assign(new Error("ID de solicitud inválido."), { status: 400 });
    }

    const result = await updateRequestStatus(
      requestId,
      req.body.status,
      req.user.id,
    );

    res.json({ success: true, request: result });
  } catch (error) {
    next(error);
  }
});

export default router;
