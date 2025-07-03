export interface AnnotationOption {
  id: string;
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  description?: string;
  icon?: string;
}

export interface AnnotationConfig {
  options: AnnotationOption[];
}

export const defaultAnnotationConfig: AnnotationConfig = {
  options: [
    {
      id: "header",
      label: "Header",
      color: "#ffffff",
      backgroundColor: "rgba(147, 51, 234, 0.2)",
      borderColor: "#9333ea",
      description: "Title, heading, or section header",
      icon: "📄",
    },
    {
      id: "title",
      label: "Title",
      color: "#ffffff",
      backgroundColor: "rgba(34, 197, 94, 0.2)",
      borderColor: "#22c55e",
      description: "Title of the text",
      icon: "🏷️",
    },
    {
      id: "author",
      label: "Author",
      color: "#ffffff",
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      borderColor: "#3b82f6",
      description: "Author of the text",
      icon: "👤",
    },
    {
      id: "translator",
      label: "Translator",
      color: "#ffffff",
      backgroundColor: "rgba(249, 115, 22, 0.2)",
      borderColor: "#f97316",
      description: "Translation of the text",
      icon: "👤",
    },
  ],
};

// Function to load annotation configuration from file or use default
export const loadAnnotationConfig = async (): Promise<AnnotationConfig> => {
  try {
    // In a real application, you might load this from an API or external file
    // For now, we'll use the default configuration
    return defaultAnnotationConfig;
  } catch (error) {
    console.warn(
      "Failed to load annotation configuration, using default:",
      error
    );
    return defaultAnnotationConfig;
  }
};

// Helper function to get annotation option by ID
export const getAnnotationOption = (
  config: AnnotationConfig,
  id: string
): AnnotationOption | undefined => {
  return config.options.find((option) => option.id === id);
};

// Helper function to validate annotation type
export const isValidAnnotationType = (
  config: AnnotationConfig,
  type: string
): boolean => {
  return config.options.some((option) => option.id === type);
};
