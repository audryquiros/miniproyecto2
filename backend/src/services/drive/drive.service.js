import { getDriveClient } from "../../config/googleDrive.js";

const POLICY_MIME_TYPES = new Set([
  "application/vnd.google-apps.document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "text/plain",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
      fields:
        "nextPageToken, files(id,name,mimeType,webViewLink,modifiedTime,version)",
      pageSize: 100,
      pageToken,
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
  if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
    const mimeType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const response = await drive.files.export(
      { fileId: file.id, mimeType },
      { responseType: "arraybuffer" },
    );
    return { mimeType, buffer: Buffer.from(response.data) };
  }

  if (file.mimeType === "application/vnd.google-apps.document") {
    const response = await drive.files.export(
      {
        fileId: file.id,
        mimeType: "text/plain",
      },
      { responseType: "text" },
    );

    return {
      mimeType: "text/plain",
      buffer: Buffer.from(response.data, "utf8"),
    };
  }

  const response = await drive.files.get(
    { fileId: file.id, alt: "media" },
    { responseType: "arraybuffer" },
  );

  return {
    mimeType: file.mimeType,
    buffer: Buffer.from(response.data),
  };
}

export async function readDriveChanges(token) {
  const drive = getDriveClient();
  if (!token)
    return {
      token: (await drive.changes.getStartPageToken()).data.startPageToken,
      changes: [],
    };
  let pageToken = token,
    newToken = token;
  const changes = [];
  try {
    do {
      const { data } = await drive.changes.list({
        pageToken,
        fields: "nextPageToken,newStartPageToken,changes(fileId,removed)",
        pageSize: 1000,
      });
      changes.push(...(data.changes || []));
      pageToken = data.nextPageToken;
      newToken = data.newStartPageToken || newToken;
    } while (pageToken);
  } catch (error) {
    if (error.code === 410)
      return {
        token: (await drive.changes.getStartPageToken()).data.startPageToken,
        changes: [],
      };
    throw error;
  }
  return { token: newToken, changes };
}
