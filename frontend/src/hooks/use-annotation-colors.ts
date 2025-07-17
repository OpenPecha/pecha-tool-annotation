import { useState, useEffect, useCallback } from "react";

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

export const useAnnotationColors = () => {
  const [colorScheme, setColorScheme] =
    useState<AnnotationColorScheme>(DEFAULT_COLOR_SCHEME);
  const [isLoaded, setIsLoaded] = useState(false);

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

  // Save colors to localStorage and apply to CSS
  const updateColorScheme = useCallback(
    (newScheme: AnnotationColorScheme) => {
      try {
        setColorScheme(newScheme);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newScheme));
        applyColorsToCSS(newScheme);
      } catch (error) {
        console.error(
          "Failed to save annotation colors to localStorage:",
          error
        );
      }
    },
    [applyColorsToCSS]
  );

  // Reset to default colors
  const resetToDefaults = useCallback(() => {
    updateColorScheme(DEFAULT_COLOR_SCHEME);
  }, [updateColorScheme]);

  return {
    colorScheme,
    updateColorScheme,
    resetToDefaults,
    isLoaded,
  };
};
