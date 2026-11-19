import { Router } from "express";
import { query } from "../config/database.js";
const router = Router();
router.get("/:id", async (req, res, next) => {
  try {
    if (process.env.LLM_PROVIDER !== "mock")
      return res
        .status(404)
        .json({
          message: "Las fuentes locales son exclusivas de demostración.",
        });
    if (!/^\d+$/.test(req.params.id))
      return res.status(400).json({ message: "Documento inválido." });
    const { rows } = await query(
      "SELECT document_name,section,chunk_text FROM policy_chunks WHERE document_id=? AND drive_file_id IS NULL ORDER BY chunk_index",
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Documento no encontrado." });
    res
      .type("text/plain")
      .send(
        "FUENTE LOCAL DE DEMOSTRACIÓN — NO ES UNA COPIA SINCRONIZADA DE DRIVE\n\n" +
          rows[0].document_name +
          "\n\n" +
          rows.map((row) => row.chunk_text).join("\n\n"),
      );
  } catch (error) {
    next(error);
  }
});
export default router;
