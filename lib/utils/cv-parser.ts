export interface ParsedPersonalInfo {
  name: string | null
  email: string | null
  phone: string | null
  location: string | null
  linkedin: string | null
  github: string | null
}

export function parsePersonalInfo(cvText: string): ParsedPersonalInfo {
  const email = cvText.match(/[\w.+-]+@[\w-]+\.\w{2,}/)?.[0] ?? null

  const phone = cvText.match(/\+?\d[\d\s\-().]{6,18}\d/)?.[0]?.trim() ?? null

  const linkedinMatch = cvText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([\w-]+)\/?/)
  const linkedin = linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : null

  const githubMatch = cvText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([\w-]+)\/?/)
  const github = githubMatch ? `https://github.com/${githubMatch[1]}` : null

  // First bullet before separators on the first line
  const firstSegment = cvText.split(/\n/)[0].split(/•|\|/)[0].trim()

  // Location: first "City, Country" — single-word city avoids capturing surname words.
  // Country may be up to 2 words (e.g. "United States").
  const locationMatch = firstSegment.match(
    /\b([A-ZÁÉÍÓÚa-záéíóú][a-záéíóú]+),\s*([A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s[A-ZÁÉÍÓÚ][a-záéíóú]+)?)\b/,
  )
  const location = locationMatch?.[0] ?? null

  // Name: everything in the first segment before the location starts
  let name: string | null = null
  if (location && locationMatch?.index !== undefined) {
    name = firstSegment.slice(0, locationMatch.index).trim() || null
  }
  if (!name) {
    name =
      firstSegment
        .replace(/[\w.+-]+@[\w-]+\.\w{2,}/g, '')
        .replace(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[\w/.-]+/g, '')
        .replace(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w/.-]+/g, '')
        .replace(/\+?\d[\d\s\-().]{6,18}\d/g, '')
        .replace(/[•|,]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || null
  }

  return { name, email, phone, location, linkedin, github }
}
