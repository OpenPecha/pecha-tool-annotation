import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NavigationMode = "error-list" | "table-of-contents";

interface AnnotationState {
  // Navigation and sidebar states
  navigationOpen: boolean;
  sidebarOpen: boolean;
  currentNavigationMode: NavigationMode;

  // Actions to update state
  setNavigationOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentNavigationMode: (mode: NavigationMode) => void;
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

      // Actions
      setNavigationOpen: (open: boolean) => set({ navigationOpen: open }),
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      setCurrentNavigationMode: (mode: NavigationMode) =>
        set({ currentNavigationMode: mode }),

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
      }),
    }
  )
);
