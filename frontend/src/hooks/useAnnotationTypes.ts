import { useQuery } from "@tanstack/react-query";
import { annotationTypeApi } from "@/api/annotation_types";
import { queryKeys } from "@/constants/queryKeys";
// ============================================================================
// Types
// ============================================================================

interface UseAnnotationTypesParams {
  skip?: number;
  limit?: number;
}

export const useAnnotationTypes = (params?: UseAnnotationTypesParams) => {
  const query = useQuery({
    queryKey: queryKeys.annotationTypes.all,
    queryFn: () => annotationTypeApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
  
  return query;
};

