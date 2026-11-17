import { syncPoliciesFromDrive } from "../services/drive/drive.ingestion.service.js";

export async function syncDrive(req, res, next) {
  try {
    const result = await syncPoliciesFromDrive();

    res.json({
      success: true,
      message: "Sincronización de políticas completada.",
      ...result
    });
  } catch (error) {
    next(error);
  }
}
