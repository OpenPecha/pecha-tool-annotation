import { useState, useEffect, useCallback, useRef } from "react";

export interface AnnotationColorScheme {
  critical: {
    background: string;
    border: string;
    label: string;
    labelBorder: string;
  };
  major: {
    background: string;
    border: string;
    label: string;
    labelBorder: string;
  };
  minor: {
    background: string;
    border: string;
    label: string;
    labelBorder: string;
  };
  default: {
    background: string;
    border: string;
    label: string;
    labelBorder: string;
  };
}

// Default color scheme matching current CSS
const DEFAULT_COLOR_SCHEME: AnnotationColorScheme = {
  critical: {
    background: "rgba(239, 68, 68, 0.2)",
    border: "#ef4444",
    label: "#ef4444",
    labelBorder: "#dc2626",
  },
  major: {
    background: "rgba(249, 115, 22, 0.2)",
    border: "#f97316",
    label: "#f97316",
    labelBorder: "#ea580c",
  },
  minor: {
    background: "rgba(34, 197, 94, 0.2)",
    border: "#22c55e",
    label: "#22c55e",
    labelBorder: "#16a34a",
  },
  default: {
    background: "rgba(107, 114, 128, 0.2)",
    border: "#6b7280",
    label: "#6b7280",
    labelBorder: "#4b5563",
  },
};

const STORAGE_KEY = "annotation-color-scheme";
const DEBOUNCE_DELAY = 1000; // 1 second

export const useAnnotationColors = () => {
  const [colorScheme, setColorScheme] =
    useState<AnnotationColorScheme>(DEFAULT_COLOR_SCHEME);
  const [pendingColorScheme, setPendingColorScheme] =
    useState<AnnotationColorScheme | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Apply colors to CSS dynamically
  const applyColorsToCSS = useCallback((scheme: AnnotationColorScheme) => {
    // Remove existing custom style if it exists
    const existingStyle = document.getElementById("annotation-color-overrides");
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element
    const style = document.createElement("style");
    style.id = "annotation-color-overrides";

    const css = `
      /* Dynamic annotation colors */
      .annotation-critical {
        background-color: ${scheme.critical.background} !important;
        border-bottom-color: ${scheme.critical.border} !important;
      }
      
      .annotation-major {
        background-color: ${scheme.major.background} !important;
        border-bottom-color: ${scheme.major.border} !important;
      }
      
      .annotation-minor {
        background-color: ${scheme.minor.background} !important;
        border-bottom-color: ${scheme.minor.border} !important;
      }
      
      .annotation-default {
        background-color: ${scheme.default.background} !important;
        border-bottom-color: ${scheme.default.border} !important;
      }
      
      /* Dynamic annotation label colors */
      .annotation-label-critical {
        background-color: ${scheme.critical.label} !important;
        border-color: ${scheme.critical.labelBorder} !important;
      }
      
      .annotation-label-major {
        background-color: ${scheme.major.label} !important;
        border-color: ${scheme.major.labelBorder} !important;
      }
      
      .annotation-label-minor {
        background-color: ${scheme.minor.label} !important;
        border-color: ${scheme.minor.labelBorder} !important;
      }
      
      .annotation-label-default {
        background-color: ${scheme.default.label} !important;
        border-color: ${scheme.default.labelBorder} !important;
      }
    `;

    style.textContent = css;
    document.head.appendChild(style);
  }, []);

  // Debounced update function
  const debouncedUpdate = useCallback(
    (scheme: AnnotationColorScheme) => {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set pending state and saving indicator
      setPendingColorScheme(scheme);
      setIsSaving(true);

      // Set new timeout for both UI update and localStorage save
      saveTimeoutRef.current = setTimeout(() => {
        try {
          // Apply colors to UI
          setColorScheme(scheme);
          applyColorsToCSS(scheme);

          // Save to localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(scheme));
        } catch (error) {
          console.error(
            "Failed to save annotation colors to localStorage:",
            error
          );
        } finally {
          setIsSaving(false);
          setPendingColorScheme(null);
          saveTimeoutRef.current = null;
        }
      }, DEBOUNCE_DELAY);
    },
    [applyColorsToCSS]
  );

  // Load colors from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedScheme = JSON.parse(saved);
        // Merge with defaults to ensure all properties exist
        const mergedScheme = {
          ...DEFAULT_COLOR_SCHEME,
          ...parsedScheme,
        };
        setColorScheme(mergedScheme);
        // Apply colors immediately and synchronously
        applyColorsToCSS(mergedScheme);
      } else {
        // Apply default colors immediately
        applyColorsToCSS(DEFAULT_COLOR_SCHEME);
      }
    } catch (error) {
      console.error(
        "Failed to load annotation colors from localStorage:",
        error
      );
      // Apply default colors as fallback
      applyColorsToCSS(DEFAULT_COLOR_SCHEME);
    } finally {
      setIsLoaded(true);
    }
  }, [applyColorsToCSS]);

  // Update color scheme with proper debouncing
  const updateColorScheme = useCallback(
    (newScheme: AnnotationColorScheme) => {
      // Use debounced update for both UI and localStorage
      debouncedUpdate(newScheme);
    },
    [debouncedUpdate]
  );

  // Reset to default colors
  const resetToDefaults = useCallback(() => {
    // Clear any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Clear pending state
    setPendingColorScheme(null);

    // Update immediately (no debounce for reset)
    setColorScheme(DEFAULT_COLOR_SCHEME);
    applyColorsToCSS(DEFAULT_COLOR_SCHEME);

    // Save immediately
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COLOR_SCHEME));
      setIsSaving(false);
    } catch (error) {
      console.error("Failed to save default colors to localStorage:", error);
    }
  }, [applyColorsToCSS]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Get the currently displayed color scheme (pending if exists, otherwise current)
  const displayColorScheme = pendingColorScheme || colorScheme;

  return {
    colorScheme: displayColorScheme,
    updateColorScheme,
    resetToDefaults,
    isLoaded,
    isSaving,
  };
};
