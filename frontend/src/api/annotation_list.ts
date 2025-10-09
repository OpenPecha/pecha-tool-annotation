import { apiClient } from "./utils";

// Types matching the backend schemas
export interface AnnotationListUploadResponse {
  success: boolean;
  message: string;
  total_records_created: number;
  record_ids: string[];
  root_type: string;
}

export interface CategoryOutput {
  id?: string;
  name: string;
  description?: string;
  level?: number;
  parent?: string;
  mnemonic?: string;
  examples?: string[];
  notes?: string;
  subcategories?: CategoryOutput[];
}

export interface HierarchicalJSONOutput {
  version?: string;
  title: string;
  description?: string;
  copyright?: string;
  categories: CategoryOutput[];
}

export interface AnnotationListResponse {
  id: string;
  type: string;
  title: string;
  level?: string;
  parent_id?: string;
  description?: string;
  created_by?: string;
  meta?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export const annotationListApi = {
  /**
   * Upload a JSON file with hierarchical annotation list
   */
  uploadFile: async (file: File): Promise<AnnotationListUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    
    return await apiClient.post<AnnotationListUploadResponse>(
      "/annotation-lists/upload",
      formData
    );
  },

  /**
   * Get annotation lists by type in hierarchical format
   */
  getByTypeHierarchical: async (type: string): Promise<HierarchicalJSONOutput> => {
    return await apiClient.get<HierarchicalJSONOutput>(
      `/annotation-lists/type/${encodeURIComponent(type)}`
    );
  },

  getAll: async (): Promise<AnnotationListResponse[]> => {
    return await apiClient.get<AnnotationListResponse[]>(
      `/annotation-lists/`
    );
  },

  /**
   * Get all unique annotation list types
   */
  getTypes: async (): Promise<string[]> => {
    return await apiClient.get<string[]>(
      `/annotation-lists/types`
    );
  },

  /**
   * Delete all annotation lists by type
   */
  deleteByType: async (type: string): Promise<{ success: boolean; message: string; deleted_count: number }> => {
    return await apiClient.delete(
      `/annotation-lists/type/${encodeURIComponent(type)}`
    );
  },

  /**
   * Helper function to validate file type
   */
  validateFileType: (file: File): boolean => {
    return file.name.endsWith(".json");
  },

  /**
   * Helper function to read and validate JSON structure
   */
  validateJsonStructure: async (file: File): Promise<{ valid: boolean; error?: string }> => {
    try {
      const content = await file.text();
      const parsed = JSON.parse(content);

      // Check for required fields
      if (!parsed.title || typeof parsed.title !== "string") {
        return { valid: false, error: 'Missing or invalid "title" field' };
      }

      if (!parsed.categories || !Array.isArray(parsed.categories)) {
        return { valid: false, error: 'Missing or invalid "categories" array' };
      }

      if (parsed.categories.length === 0) {
        return { valid: false, error: "Categories array is empty" };
      }

      // Validate first category has required fields
      const firstCategory = parsed.categories[0];
      if (!firstCategory.name) {
        return { valid: false, error: 'Categories must have a "name" field' };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid JSON format",
      };
    }
  },

  /**
   * Helper function to format file size
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  /**
   * Helper function to count total items in hierarchy
   */
  countHierarchyItems: (categories: CategoryOutput[]): number => {
    let count = categories.length;
    categories.forEach(cat => {
      if (cat.subcategories) {
        count += annotationListApi.countHierarchyItems(cat.subcategories);
      }
    });
    return count;
  },
};

