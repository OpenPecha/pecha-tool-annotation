import { useMutation, useQueryClient } from "@tanstack/react-query";
import { annotationListApi } from "@/api/annotation_list";
import { queryKeys } from "@/constants/queryKeys";
import { toast } from "sonner";

interface DeleteResponse {
  success: boolean;
  message: string;
  deleted_count: number;
}

interface UseDeleteAnnotationListByTypeOptions {
  onSuccess?: (data: DeleteResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to delete all annotation lists by type
 * 
 * @param options - Configuration options
 * @param options.onSuccess - Callback to execute on successful deletion
 * @param options.onError - Callback to execute on deletion error
 * @returns Mutation result for deleting annotation lists by type
 */
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

