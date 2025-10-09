import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NavigationMode = "error-list" | "table-of-contents";

interface AnnotationState {
  // Navigation and sidebar states
  navigationOpen: boolean;
  sidebarOpen: boolean;
  currentNavigationMode: NavigationMode;
  
  // Annotation list type selection
  selectedAnnotationListType: string;
  
  // Selected annotation types filter
  selectedAnnotationTypes: Set<string>;

  // Actions to update state
  setNavigationOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentNavigationMode: (mode: NavigationMode) => void;
  setSelectedAnnotationListType: (type: string) => void;
  setSelectedAnnotationTypes: (types: Set<string>) => void;
  toggleNavigation: () => void;
  toggleSidebar: () => void;
}

export const useAnnotationStore = create<AnnotationState>()(
  persist(
    (set) => ({
      // Initial state
      navigationOpen: false,
      sidebarOpen: true,
      currentNavigationMode: "error-list",
      selectedAnnotationListType: "",
      selectedAnnotationTypes: new Set<string>(),

      // Actions
      setNavigationOpen: (open: boolean) => set({ navigationOpen: open }),
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      setCurrentNavigationMode: (mode: NavigationMode) =>
        set({ currentNavigationMode: mode }),
      setSelectedAnnotationListType: (type: string) =>
        set({ selectedAnnotationListType: type }),
      setSelectedAnnotationTypes: (types: Set<string>) =>
        set({ selectedAnnotationTypes: types }),

      toggleNavigation: () =>
        set((state) => ({ navigationOpen: !state.navigationOpen })),
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: "annotation-store", // localStorage key
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              selectedAnnotationTypes: new Set(state.selectedAnnotationTypes || []),
            },
          };
        },
        setItem: (name, value) => {
          const str = JSON.stringify({
            state: {
              ...value.state,
              selectedAnnotationTypes: Array.from(value.state.selectedAnnotationTypes),
            },
          });
          localStorage.setItem(name, str);
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      // Only persist certain keys that should survive page refresh
      partialize: (state) => ({
        navigationOpen: state.navigationOpen,
        sidebarOpen: state.sidebarOpen,
        currentNavigationMode: state.currentNavigationMode,
        selectedAnnotationListType: state.selectedAnnotationListType,
        selectedAnnotationTypes: state.selectedAnnotationTypes,
      }),
    }
  )
);
