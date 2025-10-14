import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { annotationListApi, type HierarchicalJSONOutput, type AnnotationListUploadResponse } from "@/api/annotation_list";
import { queryKeys } from "@/constants/queryKeys";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

interface UseAnnotationListHierarchicalOptions {
  type_id: string;
  enabled?: boolean;
}

interface UseUploadAnnotationListOptions {
  onSuccess?: (data: AnnotationListUploadResponse) => void;
  onError?: (error: Error) => void;
}

interface DeleteResponse {
  success: boolean;
  message: string;
  deleted_count: number;
}

interface UseDeleteAnnotationListByTypeOptions {
  onSuccess?: (data: DeleteResponse) => void;
  onError?: (error: Error) => void;
}

export const useAnnotationListHierarchical = ({ 
  type_id, 
  enabled = true 
}: UseAnnotationListHierarchicalOptions) => {
  return useQuery<HierarchicalJSONOutput | null>({
    queryKey: queryKeys.annotationLists.byType(type_id),
    queryFn: () => type_id ? annotationListApi.getByTypeHierarchical(type_id) : Promise.resolve(null),
    enabled: enabled && !!type_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

export const useUploadAnnotationList = (options?: UseUploadAnnotationListOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      return annotationListApi.uploadFile(file);
    },
    onSuccess: (data) => {
      // Invalidate and refetch annotation lists
      queryClient.invalidateQueries({ queryKey: queryKeys.annotationLists.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotationLists.types });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotationTypes.all });
      
      toast.success("Upload successful!", {
        description: `Created ${data.total_records_created} records for "${data.root_type}"`,
      });

      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error("Upload failed", {
        description: error.message || "Failed to upload annotation list",
      });

      options?.onError?.(error);
    },
  });
};

export const useDeleteAnnotationListByType = (options?: UseDeleteAnnotationListByTypeOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: string) => {
      return annotationListApi.deleteByType(type);
    },
    onSuccess: (data) => {
      // Invalidate and refetch annotation lists
      queryClient.invalidateQueries({ queryKey: queryKeys.annotationLists.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotationLists.types });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotationTypes.all });

      toast.success("Deleted successfully!", {
        description: `Removed ${data.deleted_count} records`,
      });

      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error("Delete failed", {
        description: error.message || "Failed to delete annotation list",
      });

      options?.onError?.(error);
    },
  });
};

