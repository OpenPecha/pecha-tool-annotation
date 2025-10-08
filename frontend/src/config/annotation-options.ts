import { annotationListApi } from "@/api/annotation_list";

export interface AnnotationOption {
  id: string;
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  description?: string;
  icon?: string;
  mnemonic?: string;
  examples?: string[];
  notes?: string;
  level?: number;
  parent?: string;
}

export interface AnnotationConfig {
  options: AnnotationOption[];
}

// Interface for error category structure from error_list.json
interface ErrorCategory {
  id?: string;
  name: string;
  mnemonic?: string;
  description?: string;
  examples?: string[];
  notes?: string;
  level?: number;
  parent?: string;
  subcategories?: ErrorCategory[];
}

// Helper function to extract leaf nodes (innermost categories) from error list
const extractLeafNodes = (
  categories: ErrorCategory[],
  level: number = 0
): AnnotationOption[] => {
  const leafNodes: AnnotationOption[] = [];

  for (const category of categories) {
    if (!category.subcategories || category.subcategories.length === 0) {
      // This is a leaf node - no subcategories
      // Only add if category has an id
      if (category.id) {
        leafNodes.push({
          id: category.id,
          label: category.name,
          mnemonic: category.mnemonic || '',
          description: category.description || '',
          examples: category.examples,
          notes: category.notes,
          level: category.level,
          parent: category.parent,
          // Color scheme based on error severity - using orange theme for errors
          color: "#ffffff",
          backgroundColor: "rgba(249, 115, 22, 0.2)",
          borderColor: "#f97316",
          icon: "⚠️",
        });
      }
    } else {
      // Recursively process subcategories
      leafNodes.push(...extractLeafNodes(category.subcategories, level + 1));
    }
  }

  return leafNodes;
};

// Function to load annotation configuration from error list
export const loadAnnotationConfig = async (type?: string): Promise<AnnotationConfig> => {
  try {
    const annotationListType = type || "";
    
    // Load error list from the server
    const response = await annotationListApi.getByTypeHierarchical(annotationListType);
    if (!response) {
      throw new Error(`Failed to load error list for type: ${annotationListType}`);
    }

    const errorData = response;
    const categories = errorData.categories || [];

    // Extract only leaf nodes (innermost categories) for annotation options
    const leafNodes = extractLeafNodes(categories);

    return {
      options: leafNodes,
    };
  } catch (error) {
    console.warn(
      "Failed to load error list for annotation configuration, using empty config:",
      error
    );
    // Return empty config if error list can't be loaded
    return {
      options: [],
    };
  }
};

// Helper function to get annotation option by ID or label
export const getAnnotationOption = (
  config: AnnotationConfig,
  identifier: string
): AnnotationOption | undefined => {
  return config.options.find(
    (option) => option.id === identifier || option.label === identifier
  );
};

// Helper function to validate annotation type (accepts both ID and label)
export const isValidAnnotationType = (
  config: AnnotationConfig,
  type: string
): boolean => {
  return config.options.some(
    (option) => option.id === type || option.label === type
  );
};

// Helper function to get annotation display name
export const getAnnotationDisplayName = (
  config: AnnotationConfig,
  type: string,
  customName?: string
): string => {
  if (customName && customName.trim()) {
    return customName;
  }

  const option = getAnnotationOption(config, type);
  return option?.label || type;
};
