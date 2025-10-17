import type { AnnotationResponse } from "@/api/types";
import type { AnnotationReviewResponse } from "@/api/reviews";
import { reviewApi } from "@/api/reviews";

/**
 * Annotation type used in the UI layer
 * Simplified from API response format for easier component consumption
 */
export type Annotation = {
  id: string;
  type: string;
  text: string;
  start: number;
  end: number;
  name?: string;
  level?: "minor" | "major" | "critical";
  annotator_id?: number;
  is_agreed?: boolean;
  reviews?: Array<{
    id: number;
    decision: "agree" | "disagree";
    comment?: string;
    reviewer_id: number;
    created_at: string;
  }>;
};

/**
 * Converts API annotation responses to UI annotation format
 * Fetches and attaches review data for each annotation
 * 
 * @param apiAnnotations - Array of annotations from API
 * @returns Promise resolving to array of UI-formatted annotations
 */
export const convertApiAnnotations = async (
  apiAnnotations: AnnotationResponse[]
): Promise<Annotation[]> => {
  const annotationsWithReviews = await Promise.all(
    apiAnnotations.map(async (ann) => {
      let reviews: AnnotationReviewResponse[] = [];
      try {
        reviews = await reviewApi.getAnnotationReviews(ann.id);
      } catch (error) {
        console.warn(
          `Failed to fetch reviews for annotation ${ann.id}:`,
          error
        );
        reviews = [];
      }

      return {
        id: ann.id.toString(),
        type: ann.annotation_type,
        text: ann.selected_text || "",
        start: ann.start_position,
        end: ann.end_position,
        name: ann.name,
        level: ann.level,
        annotator_id: ann.annotator_id,
        is_agreed: ann.is_agreed,
        reviews: reviews,
      };
    })
  );

  return annotationsWithReviews;
};

/**
 * Converts a single API annotation to UI format (without reviews)
 * Used for optimistic updates
 */
export const convertSingleAnnotation = (ann: AnnotationResponse): Annotation => {
  return {
    id: ann.id.toString(),
    type: ann.annotation_type,
    text: ann.selected_text || "",
    start: ann.start_position,
    end: ann.end_position,
    name: ann.name,
    level: ann.level as "minor" | "major" | "critical" | undefined,
    annotator_id: ann.annotator_id,
    is_agreed: ann.is_agreed,
    reviews: [],
  };
};

/**
 * Synchronous conversion of API annotations to UI annotations.
 * Does NOT fetch reviews; intended for render-time mapping or React Query select.
 */
export const convertApiAnnotationsSync = (
  apiAnnotations: AnnotationResponse[]
): Annotation[] => {
  return apiAnnotations.map((ann) => ({
    id: ann.id.toString(),
    type: ann.annotation_type,
    text: ann.selected_text || "",
    start: ann.start_position,
    end: ann.end_position,
    name: ann.name,
    level: ann.level as "minor" | "major" | "critical" | undefined,
    annotator_id: ann.annotator_id,
    is_agreed: ann.is_agreed,
    reviews: [],
  }));
};

