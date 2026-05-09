const DEFAULT_CHUNK_SIZE = 2000 // ~500 tokens at ~4 chars/token
const DEFAULT_CHUNK_OVERLAP = 200 // ~50 tokens

export function splitIntoChunks(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  chunkOverlap = DEFAULT_CHUNK_OVERLAP,
): string[] {
  if (!text.trim()) return []

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)

    // Prefer splitting at a natural boundary within the window
    let splitAt = end
    if (end < text.length) {
      const nnl = text.lastIndexOf('\n\n', end)
      const nl = text.lastIndexOf('\n', end)
      const dot = text.lastIndexOf('. ', end)
      const sp = text.lastIndexOf(' ', end)

      const candidate = [nnl, nl, dot, sp].find((i) => i > start + chunkOverlap)
      if (candidate !== undefined) splitAt = candidate + 1
    }

    const chunk = text.slice(start, splitAt).trim()
    if (chunk) chunks.push(chunk)

    // Next window starts with overlap, but always advances
    const next = splitAt - chunkOverlap
    start = next > start ? next : splitAt
  }

  return chunks
}
