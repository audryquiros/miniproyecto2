export function chunkText(text, chunkSize = 800, overlap = 120) {
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
