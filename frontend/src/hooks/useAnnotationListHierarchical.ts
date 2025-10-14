import { useQuery } from "@tanstack/react-query";
import { annotationListApi, type HierarchicalJSONOutput } from "@/api/annotation_list";
import { queryKeys } from "@/constants/queryKeys";

interface UseAnnotationListHierarchicalOptions {
  type_id: string;
  enabled?: boolean;
}

/**
 * Hook to fetch hierarchical annotation list data by type_id
 * 
 * @param options - Configuration options
 * @param options.type_id - The annotation list type_id to fetch
 * @param options.enabled - Whether the query should run (default: true if type is provided)
 * @returns Query result with hierarchical annotation list data
 */
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

