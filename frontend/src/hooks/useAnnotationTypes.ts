import { useQuery } from "@tanstack/react-query";
import { annotationTypeApi } from "@/api/annotation_types";
import { queryKeys } from "@/constants/queryKeys";
import { useAnnotationFiltersStore } from "@/store/annotationFilters";
import { useEffect } from "react";

/**
 * Hook to fetch all annotation types
 * 
 * @param skip - Number of records to skip (pagination)
 * @param limit - Maximum number of records to return (pagination)
 * @returns Query result with array of annotation types
 */
export const useAnnotationTypes = (params?: { skip?: number; limit?: number }) => {
  const { setSelectedAnnotationListType } = useAnnotationFiltersStore();
  
  const query = useQuery({
    queryKey: queryKeys.annotationTypes.all,
    queryFn: () => annotationTypeApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Update store when data is available
  useEffect(() => {
    if (query.data && query.data.length > 0) {
      // Set the first annotation type as default if none is selected
      setSelectedAnnotationListType(query.data[0].id);
    }
  }, [query.data, setSelectedAnnotationListType]);

  return query;
};

