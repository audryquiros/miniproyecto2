import mysql from "mysql2/promise";
import "dotenv/config";
const name = process.env.DB_NAME;
if (!name || !/^[a-zA-Z0-9_]{1,64}$/.test(name))
  throw new Error(
    "DB_NAME debe contener solo letras, números o guiones bajos.",
  );
const c = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectTimeout: 5000,
});
try {
  await c.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  console.log(
    "Base dedicada disponible; no se han alterado tablas existentes.",
  );
} finally {
  await c.end();
}
