import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { HarvardCv } from '@/lib/schemas/harvard-cv.schema'

const IN = 72 // 1 inch = 72pt

const s = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    paddingTop: IN,
    paddingBottom: IN,
    paddingLeft: IN,
    paddingRight: IN,
    color: '#000000',
    lineHeight: 1.4,
  },
  // ── Header ──────────────────────────────────────────────────────
  name: {
    fontFamily: 'Times-Bold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 3,
  },
  jobTitle: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 5,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 14,
    fontSize: 9,
    color: '#222222',
    gap: 10,
  },
  // ── Section ──────────────────────────────────────────────────────
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    borderBottomWidth: 0.75,
    borderBottomColor: '#000000',
    paddingBottom: 2,
    marginTop: 12,
    marginBottom: 5,
  },
  // ── Summary ──────────────────────────────────────────────────────
  summary: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  // ── Experience ───────────────────────────────────────────────────
  expBlock: {
    marginBottom: 7,
  },
  expRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  expTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
  },
  expPeriod: {
    fontSize: 9,
    color: '#333333',
  },
  expMeta: {
    fontSize: 9,
    color: '#333333',
    marginBottom: 3,
  },
  bullet: {
    flexDirection: 'row',
    paddingLeft: 10,
    marginBottom: 1.5,
  },
  bulletDot: {
    width: 10,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
  },
  // ── Education ───────────────────────────────────────────────────
  eduBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  eduLeft: {
    flex: 1,
  },
  eduDegree: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
  },
  eduMeta: {
    fontSize: 9,
    color: '#333333',
  },
  eduYear: {
    fontSize: 9,
    color: '#333333',
  },
  // ── Skills ──────────────────────────────────────────────────────
  skillRow: {
    flexDirection: 'row',
    marginBottom: 3,
    fontSize: 9,
  },
  skillLabel: {
    fontFamily: 'Times-Bold',
    width: 64,
  },
  skillValues: {
    flex: 1,
  },
  // ── Languages ───────────────────────────────────────────────────
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    fontSize: 9,
  },
})

interface HarvardCvPdfProps {
  cv: HarvardCv
}

export function HarvardCvPdf({ cv }: HarvardCvPdfProps) {
  const contactItems = [
    cv.personal.email,
    cv.personal.phone,
    cv.personal.location,
    cv.personal.linkedin,
    cv.personal.github,
  ].filter(Boolean) as string[]

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* ── Header ── */}
        <Text style={s.name}>{cv.personal.name}</Text>
        <Text style={s.jobTitle}>{cv.title}</Text>
        <View style={s.contactRow}>
          {contactItems.map((item, i) => (
            <Text key={i}>{item}</Text>
          ))}
        </View>

        {/* ── Summary ── */}
        <Text style={s.sectionTitle}>Summary</Text>
        <Text style={s.summary}>{cv.summary}</Text>

        {/* ── Experience ── */}
        {cv.experience.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Experience</Text>
            {cv.experience.map((exp, i) => (
              <View key={i} style={s.expBlock}>
                <View style={s.expRow}>
                  <Text style={s.expTitle}>{exp.title}</Text>
                  <Text style={s.expPeriod}>{exp.period}</Text>
                </View>
                <Text style={s.expMeta}>
                  {exp.company} · {exp.location}
                </Text>
                {exp.highlights.map((h, j) => (
                  <View key={j} style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletText}>{h}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* ── Education ── */}
        {cv.education.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Education</Text>
            {cv.education.map((edu, i) => (
              <View key={i} style={s.eduBlock}>
                <View style={s.eduLeft}>
                  <Text style={s.eduDegree}>{edu.degree}</Text>
                  <Text style={s.eduMeta}>
                    {edu.institution} · {edu.location}
                    {edu.honors ? ` · ${edu.honors}` : ''}
                  </Text>
                </View>
                <Text style={s.eduYear}>{edu.year}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── Skills ── */}
        {(cv.skills.technical.length > 0 || cv.skills.soft.length > 0) && (
          <>
            <Text style={s.sectionTitle}>Skills</Text>
            {cv.skills.technical.length > 0 && (
              <View style={s.skillRow}>
                <Text style={s.skillLabel}>Technical</Text>
                <Text style={s.skillValues}>{cv.skills.technical.join(', ')}</Text>
              </View>
            )}
            {cv.skills.soft.length > 0 && (
              <View style={s.skillRow}>
                <Text style={s.skillLabel}>Soft</Text>
                <Text style={s.skillValues}>{cv.skills.soft.join(', ')}</Text>
              </View>
            )}
          </>
        )}

        {/* ── Certifications ── */}
        {cv.certifications && cv.certifications.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Certifications</Text>
            {cv.certifications.map((cert, i) => (
              <View key={i} style={s.bullet}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={s.bulletText}>{cert}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── Languages ── */}
        {cv.languages.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Languages</Text>
            <View style={s.langRow}>
              {cv.languages.map((lang, i) => (
                <Text key={i}>
                  {lang.language} — {lang.level}
                </Text>
              ))}
            </View>
          </>
        )}
      </Page>
    </Document>
  )
}
