import { useEffect, useState } from "react"
import { AiOutlineLoading3Quarters } from "react-icons/ai"
import { textApi } from "@/api/text"

interface DiplomaticTextPanelProps {
  textId: number | undefined
  isVisible: boolean
}

export function DiplomaticTextPanel({
  textId,
  isVisible,
}: DiplomaticTextPanelProps) {
  const [diplomaticText, setDiplomaticText] = useState<string | null | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!isVisible || textId === undefined) {
      setDiplomaticText(undefined)
      setError(null)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    textApi
      .getDiplomaticText(textId)
      .then((res) => {
        if (!cancelled) {
          setDiplomaticText(res.diplomatic_text ?? null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isVisible, textId])

  if (!isVisible) return null

  return (
    <div className="flex flex-col flex-shrink-0 h-[45vh] min-h-[200px] border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-200 bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-800">Diplomatic transcription</h2>
      </div>
      <div className="flex-1 overflow-auto p-4 min-h-0">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <AiOutlineLoading3Quarters className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-sm text-slate-600">Loading diplomatic text…</p>
          </div>
        )}
        {error && (
          <p className="text-red-600 text-sm py-4">
            Failed to load diplomatic text: {error.message}
          </p>
        )}
        {!isLoading && !error && diplomaticText === null && (
          <p className="text-slate-500 py-4">No diplomatic transcription available for this text.</p>
        )}
        {!isLoading && !error && diplomaticText != null && diplomaticText !== "" && (
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed">
            {diplomaticText}
          </pre>
        )}
        {!isLoading && !error && diplomaticText === "" && (
          <p className="text-slate-500 py-4">Diplomatic transcription is empty.</p>
        )}
      </div>
    </div>
  )
}
