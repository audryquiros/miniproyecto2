import "dotenv/config";
import { syncPoliciesFromDrive } from "../src/services/drive/drive.ingestion.service.js";
import { pool } from "../src/config/database.js";
try {
  const result = await syncPoliciesFromDrive();
  console.log(
    JSON.stringify(
      {
        totalFiles: result.totalFiles,
        results: result.results.map(({ name, status, chunks }) => ({
          name,
          status,
          chunks,
        })),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error("No se completó la sincronización:", error.code || error.name);
  if (error.code === "VOYAGE_UNAVAILABLE") {
    console.error(error.message);
    if (error.retryAfterMs)
      console.error(
        `Espera indicada por Voyage: ${Math.ceil(error.retryAfterMs / 1000)} s.`,
      );
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}
