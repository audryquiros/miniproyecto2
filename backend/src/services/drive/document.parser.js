import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import readXlsxFile from "read-excel-file/node";

export async function extractText(buffer, mimeType) {
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    const sheets = await readXlsxFile(buffer);
    const texts = [];
    for (const sheet of sheets) {
      const rows = sheet.data;
      texts.push(
        `Hoja: ${sheet.sheet}\n` +
          rows
            .map((row) =>
              row
                .map((value) =>
                  value instanceof Date
                    ? value.toISOString().slice(0, 10)
                    : (value ?? ""),
                )
                .join(" | "),
            )
            .join("\n"),
      );
    }
    return texts.join("\n\n");
  }
  if (mimeType === "text/plain") {
    return buffer.toString("utf8");
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimeType === "application/pdf") {
    const result = await pdfParse(buffer);
    return result.text;
  }

  throw new Error(`Tipo de documento no soportado: ${mimeType}`);
}
