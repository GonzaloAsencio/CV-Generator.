'use client'

import dynamic from 'next/dynamic'
import type { HarvardCv } from '@/lib/schemas/harvard-cv.schema'
import { HarvardCvPdf } from './harvard-cv-pdf'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
  { ssr: false },
)

function buildFileName(name: string, company: string): string {
  const sanitize = (s: string) =>
    s
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w_\-áéíóúÁÉÍÓÚñÑüÜ]/g, '')
  return `CV_Harvard_${sanitize(name)}_${sanitize(company)}.pdf`
}

interface DownloadCvButtonProps {
  cv: HarvardCv
  companyName: string
}

export function DownloadCvButton({ cv, companyName }: DownloadCvButtonProps) {
  const fileName = buildFileName(cv.personal.name, companyName)

  return (
    <PDFDownloadLink document={<HarvardCvPdf cv={cv} />} fileName={fileName}>
      {({ loading }: { loading: boolean }) => (
        <button
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 transition-colors"
        >
          {loading ? (
            <>
              <Spinner />
              Preparando PDF…
            </>
          ) : (
            <>
              <DownloadIcon />
              Descargar PDF
            </>
          )}
        </button>
      )}
    </PDFDownloadLink>
  )
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
