import app from "./app.js";
import { startScheduler } from "./services/scheduler/scheduler.service.js";
import { pool } from "./config/database.js";
import { createServer } from "node:http";
let stop = () => {};
const server = createServer(app);
server.once("error", (error) => {
  console.error("No se pudo iniciar el backend:", error.code);
  stop();
  pool.end().finally(() => { process.exitCode = 1; });
});
server.listen(
  process.env.PORT || 3000,
  process.env.HOST || "127.0.0.1",
  () => {
    console.log("Nuvexa backend iniciado.");
    stop = startScheduler();
  },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    stop();
    server.close(() => pool.end().then(() => process.exit(0)));
  });
