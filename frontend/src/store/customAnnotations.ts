import { create } from "zustand"
import type { AnnotationOption } from "@/config/annotation-options"

interface CustomAnnotationsState {
  /** Custom annotation options keyed by annotation list type ID */
  customOptionsByListType: Record<string, AnnotationOption[]>

  /** Add a custom annotation to the list for a given type */
  addCustomAnnotation: (listType: string, label: string) => void

  /** Get custom options for a list type */
  getCustomOptions: (listType: string) => AnnotationOption[]
}

const createOptionFromLabel = (label: string): AnnotationOption => ({
  id: `custom-${label.trim().toLowerCase().replaceAll(/\s+/g, "-")}`,
  label: label.trim(),
  color: "#ffffff",
  backgroundColor: "rgba(249, 115, 22, 0.2)",
  borderColor: "#f97316",
  icon: "⚠️",
})

export const useCustomAnnotationsStore = create<CustomAnnotationsState>((set, get) => ({
  customOptionsByListType: {},

  addCustomAnnotation: (listType: string, label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return

    const option = createOptionFromLabel(trimmed)
    const existing = get().customOptionsByListType[listType] ?? []
    const alreadyExists = existing.some(
      (o) => o.label.toLowerCase() === trimmed.toLowerCase()
    )
    if (alreadyExists) return

    set((state) => ({
      customOptionsByListType: {
        ...state.customOptionsByListType,
        [listType]: [...existing, option],
      },
    }))
  },

  getCustomOptions: (listType: string) => {
    return get().customOptionsByListType[listType] ?? []
  },
}))
