import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkUploadApi } from "@/api/bulk-upload";
import { queryKeys } from "@/constants/queryKeys";
import type { ValidationResponse, BulkUploadResponse } from "@/api/bulk-upload";

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Validate multiple JSON files without uploading
 */
export const useValidateBulkUpload = () => {
  return useMutation<ValidationResponse, Error, File[]>({
    mutationFn: async (files: File[]) => {
      const formData = bulkUploadApi.createFormData(files);
      return bulkUploadApi.validateFiles(formData);
    },
  });
};

/**
 * Upload multiple JSON files and create texts/annotations
 */
export const useUploadBulk = () => {
  const queryClient = useQueryClient();

  return useMutation<BulkUploadResponse, Error, { files: File[]; annotationTypeId?: string }>({
    mutationFn: async ({ files, annotationTypeId }) => {
      const formData = bulkUploadApi.createFormData(files, annotationTypeId);
      return bulkUploadApi.uploadFiles(formData);
    },
    onSuccess: () => {
      // Invalidate all text-related queries after successful upload
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.forAnnotation });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.adminStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotations.stats() });
    },
  });
};

// ============================================================================
// Helper Functions (re-exported for convenience)
// ============================================================================

export const bulkUploadHelpers = {
  createFormData: bulkUploadApi.createFormData,
  validateFileTypes: bulkUploadApi.validateFileTypes,
  readFileContent: bulkUploadApi.readFileContent,
  validateJsonFormat: bulkUploadApi.validateJsonFormat,
  formatFileSize: bulkUploadApi.formatFileSize,
  getUploadStats: bulkUploadApi.getUploadStats,
  getValidationStats: bulkUploadApi.getValidationStats,
};

