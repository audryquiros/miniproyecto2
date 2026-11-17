import { getDriveClient } from "../../config/googleDrive.js";

const POLICY_MIME_TYPES = new Set([
  "application/vnd.google-apps.document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "text/plain"
]);

export async function listPolicyFiles() {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID no está configurado.");
  }

  const files = [];
  let pageToken;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id,name,mimeType,webViewLink,modifiedTime,version)",
      pageSize: 100,
      pageToken
    });

    for (const file of response.data.files || []) {
      if (POLICY_MIME_TYPES.has(file.mimeType)) {
        files.push(file);
      }
    }

    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return files;
}

export async function downloadPolicyFile(file) {
  const drive = getDriveClient();

  if (file.mimeType === "application/vnd.google-apps.document") {
    const response = await drive.files.export(
      {
        fileId: file.id,
        mimeType: "text/plain"
      },
      { responseType: "text" }
    );

    return {
      mimeType: "text/plain",
      buffer: Buffer.from(response.data, "utf8")
    };
  }

  const response = await drive.files.get(
    { fileId: file.id, alt: "media" },
    { responseType: "arraybuffer" }
  );

  return {
    mimeType: file.mimeType,
    buffer: Buffer.from(response.data)
  };
}
