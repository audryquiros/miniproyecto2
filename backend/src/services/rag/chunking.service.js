export function chunkText(text, chunkSize = 800, overlap = 120) {
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < 1 ||
    !Number.isInteger(overlap) ||
    overlap < 0 ||
    overlap >= chunkSize
  )
    throw new Error("Tamaño de fragmento o solapamiento inválido.");
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];

  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);

    chunks.push(words.slice(start, end).join(" "));

    if (end === words.length) break;

    start = end - overlap;
  }

  return chunks;
}
