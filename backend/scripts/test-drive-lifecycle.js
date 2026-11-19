import "dotenv/config";
import assert from "node:assert/strict";
import { google } from "googleapis";
import { randomUUID } from "node:crypto";
// Prueba preparada por petición del usuario: requiere una carpeta aparte
// con permiso editor. Nunca usa la carpeta de políticas como destino.
const folder = process.env.DRIVE_TEST_FOLDER_ID;
if (!folder || folder === process.env.GOOGLE_DRIVE_FOLDER_ID)
  throw new Error(
    "Configura DRIVE_TEST_FOLDER_ID con una carpeta de prueba distinta, compartida como editora.",
  );
if (!process.argv.includes("--run"))
  throw new Error(
    "Usa --run para crear, actualizar y enviar a papelera UN archivo propio de prueba.",
  );
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n",
  ),
  scopes: ["https://www.googleapis.com/auth/drive"],
});
const drive = google.drive({ version: "v3", auth });
let fileId;
const name = `nuvexa-prueba-${randomUUID()}.txt`;
try {
  const created = await drive.files.create({
    requestBody: { name, parents: [folder] },
    media: {
      mimeType: "text/plain",
      body: "Versión: 1.0\nDocumento ficticio de prueba.",
    },
    fields: "id",
  });
  fileId = created.data.id;
  assert.ok(fileId);
  await drive.files.update({
    fileId,
    media: {
      mimeType: "text/plain",
      body: "Versión: 1.1\nDocumento ficticio actualizado.",
    },
  });
  const read = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "text" },
  );
  assert.match(read.data, /1\.1/);
  await drive.files.update({ fileId, requestBody: { trashed: true } });
  const state = await drive.files.get({ fileId, fields: "trashed" });
  assert.equal(state.data.trashed, true);
  console.log("Alta, cambio, lectura y baja en carpeta aislada: correctos.");
} finally {
  if (fileId)
    await drive.files
      .update({ fileId, requestBody: { trashed: true } })
      .catch(() => {});
}
