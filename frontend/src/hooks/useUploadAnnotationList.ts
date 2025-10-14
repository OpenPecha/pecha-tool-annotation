import { useMutation, useQueryClient } from "@tanstack/react-query";
import { annotationListApi, type AnnotationListUploadResponse } from "@/api/annotation_list";
import { queryKeys } from "@/constants/queryKeys";
import { toast } from "sonner";

interface UseUploadAnnotationListOptions {
  onSuccess?: (data: AnnotationListUploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to upload an annotation list file
 * 
 * @param options - Configuration options
 * @param options.onSuccess - Callback to execute on successful upload
 * @param options.onError - Callback to execute on upload error
 * @returns Mutation result for uploading annotation list
 */
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

