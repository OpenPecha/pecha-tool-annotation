import { apiClient } from "./utils";

// Types matching the backend schemas
export interface FileValidationResult {
  filename: string;
  valid: boolean;
  errors: string[];
  text_title?: string;
  annotations_count: number;
}

export interface UploadResult {
  filename: string;
  success: boolean;
  text_id?: number;
  created_annotations: number;
  error?: string;
  validation_errors?: string[];
}

export interface BulkUploadResponse {
  success: boolean;
  total_files: number;
  successful_files: number;
  failed_files: number;
  results: UploadResult[];
  summary: {
    total_texts_created: number;
    total_annotations_created: number;
    success_rate: number;
    processing_details: {
      files_processed: number;
      successful: number;
      failed: number;
    };
  };
}

export interface ValidationResponse {
  total_files: number;
  valid_files: number;
  invalid_files: number;
  validation_rate: number;
  results: FileValidationResult[];
}

export const bulkUploadApi = {
  /**
   * Validate multiple JSON files without uploading
   */
  validateFiles: async (formData: FormData): Promise<ValidationResponse> => {
    return await apiClient.post<ValidationResponse>(
      "/bulk-upload/validate-files",
      formData
    );
  },

  /**
   * Upload multiple JSON files and create texts/annotations
   */
  uploadFiles: async (formData: FormData): Promise<BulkUploadResponse> => {
    return await apiClient.post<BulkUploadResponse>(
      "/bulk-upload/upload-files",
      formData
    );
  },

  /**
   * Helper function to create FormData from File array
   */
  createFormData: (files: File[], annotationTypeId?: string): FormData => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    if (annotationTypeId) {
      formData.append("annotation_type_id", annotationTypeId);
    }
    return formData;
  },

  /**
   * Helper function to validate file types
   */
  validateFileTypes: (files: File[]): { valid: File[]; invalid: File[] } => {
    const valid: File[] = [];
    const invalid: File[] = [];

    files.forEach((file) => {
      if (file.name.endsWith(".json")) {
        valid.push(file);
      } else {
        invalid.push(file);
      }
    });

    return { valid, invalid };
  },

  /**
   * Helper function to read file content as text
   */
  readFileContent: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      reader.readAsText(file);
    });
  },

  /**
   * Helper function to validate JSON format locally
   */
  validateJsonFormat: async (
    file: File
  ): Promise<{ valid: boolean; error?: string }> => {
    try {
      const content = await bulkUploadApi.readFileContent(file);
      const parsed = JSON.parse(content);

      // Basic structure validation
      if (!parsed.text || typeof parsed.text !== "object") {
        return { valid: false, error: 'Missing or invalid "text" object' };
      }

      if (!parsed.text.title || !parsed.text.content) {
        return {
          valid: false,
          error: "Missing required fields in text object (title, content)",
        };
      }

      if (parsed.annotations && !Array.isArray(parsed.annotations)) {
        return { valid: false, error: "Annotations must be an array" };
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
   * Helper function to get file size in human readable format
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  /**
   * Helper function to get upload statistics
   */
  getUploadStats: (response: BulkUploadResponse) => ({
    totalFiles: response.total_files,
    successRate: response.summary.success_rate,
    textsCreated: response.summary.total_texts_created,
    annotationsCreated: response.summary.total_annotations_created,
    avgAnnotationsPerText:
      response.summary.total_texts_created > 0
        ? Math.round(
            response.summary.total_annotations_created /
              response.summary.total_texts_created
          )
        : 0,
    failedFiles: response.results
      .filter((r) => !r.success)
      .map((r) => ({
        filename: r.filename,
        error: r.error || "Unknown error",
      })),
  }),

  /**
   * Helper function to get validation statistics
   */
  getValidationStats: (response: ValidationResponse) => ({
    totalFiles: response.total_files,
    validFiles: response.valid_files,
    validationRate: response.validation_rate,
    totalAnnotations: response.results.reduce(
      (sum, r) => sum + r.annotations_count,
      0
    ),
    avgAnnotationsPerFile:
      response.valid_files > 0
        ? Math.round(
            response.results.reduce((sum, r) => sum + r.annotations_count, 0) /
              response.valid_files
          )
        : 0,
    invalidFiles: response.results
      .filter((r) => !r.valid)
      .map((r) => ({
        filename: r.filename,
        errors: r.errors,
      })),
  }),
};
