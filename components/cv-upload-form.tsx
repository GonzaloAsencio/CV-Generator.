'use client'

import { useState, useRef, useCallback } from 'react'

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'success'; chunks: number }
  | { status: 'error'; message: string }

interface CvUploadFormProps {
  onSuccess?: (chunks: number) => void
}

export function CvUploadForm({ onSuccess }: CvUploadFormProps) {
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setState({ status: 'error', message: 'Solo se aceptan archivos PDF.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setState({ status: 'error', message: 'El archivo debe pesar menos de 5MB.' })
      return
    }

    setState({ status: 'uploading' })

    const body = new FormData()
    body.append('cv', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body })
      const json = await res.json()

      if (!res.ok) {
        setState({ status: 'error', message: json.error?.message ?? 'Error al subir el CV.' })
        return
      }

      setState({ status: 'success', chunks: json.chunks })
      onSuccess?.(json.chunks)
    } catch {
      setState({ status: 'error', message: 'Error de red. Intentá de nuevo.' })
    }
  }, [onSuccess])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files?.[0]) upload(files[0])
    },
    [upload],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const isUploading = state.status === 'uploading'

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de CV"
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !isUploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          'cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          isUploading
            ? 'cursor-not-allowed border-gray-200 bg-gray-50'
            : isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          disabled={isUploading}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {isUploading ? (
          <>
            <Spinner />
            <p className="text-sm text-gray-500">Procesando tu CV…</p>
          </>
        ) : (
          <>
            <PdfIcon />
            <div>
              <p className="font-medium text-gray-700">
                {state.status === 'success'
                  ? 'CV cargado — subí uno nuevo'
                  : 'Arrastrá tu CV o hacé clic para seleccionarlo'}
              </p>
              <p className="mt-1 text-sm text-gray-400">PDF · máximo 5MB</p>
            </div>
          </>
        )}
      </div>

      {state.status === 'success' && (
        <p className="mt-3 text-sm font-medium text-green-600">
          CV procesado correctamente — {state.chunks} chunk{state.chunks !== 1 ? 's' : ''} generados.
        </p>
      )}

      {state.status === 'error' && (
        <p className="mt-3 text-sm font-medium text-red-600">{state.message}</p>
      )}
    </div>
  )
}

function PdfIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      className="h-8 w-8 animate-spin text-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
