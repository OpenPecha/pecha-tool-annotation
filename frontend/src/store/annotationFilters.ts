import { create } from "zustand";

interface AnnotationFiltersState {
  // Annotation list type selection
  selectedAnnotationListType: string;
  
  // Selected annotation types filter
  selectedAnnotationTypes: Set<string>;

  // Actions to update state
  setSelectedAnnotationListType: (type: string) => void;
  setSelectedAnnotationTypes: (types: Set<string>) => void;
  resetFilters: () => void;
}

export const useAnnotationFiltersStore = create<AnnotationFiltersState>((set) => ({
  // Initial state
  selectedAnnotationListType: "",
  selectedAnnotationTypes: new Set<string>(),

  // Actions
  setSelectedAnnotationListType: (type: string) =>
    set({ selectedAnnotationListType: type }),
  setSelectedAnnotationTypes: (types: Set<string>) =>
    set({ selectedAnnotationTypes: types }),
  resetFilters: () =>
    set({
      selectedAnnotationListType: "",
      selectedAnnotationTypes: new Set<string>(),
    }),
}));

