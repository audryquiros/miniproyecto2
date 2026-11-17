import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export async function extractText(buffer, mimeType) {
  if (mimeType === "text/plain") {
    return buffer.toString("utf8");
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimeType === "application/pdf") {
    const result = await pdfParse(buffer);
    return result.text;
  }

  throw new Error(`Tipo de documento no soportado: ${mimeType}`);
}
