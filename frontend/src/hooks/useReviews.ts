import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewApi } from "@/api/reviews";
import { queryKeys } from "@/constants/queryKeys";
import type {
  ReviewSubmission,
  ReviewSessionResponse,
  ReviewStatus,
  ReviewSubmissionResponse,
  AnnotationReviewResponse,
  TextForReview,
  ReviewProgressItem,
  ReviewerStats,
  TextNeedingRevision,
} from "@/api/reviews";

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get texts that are ready for review
 */
export const useTextsForReview = (filters?: { skip?: number; limit?: number }) => {
  return useQuery<TextForReview[]>({
    queryKey: [...queryKeys.reviews.forReview, filters],
    queryFn: () => reviewApi.getTextsForReview(filters),
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get reviewer's work in progress
 */
export const useMyReviewProgress = (filters?: { skip?: number; limit?: number }) => {
  return useQuery<ReviewProgressItem[]>({
    queryKey: [...queryKeys.reviews.myProgress, filters],
    queryFn: () => reviewApi.getMyReviewProgress(filters),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

/**
 * Get review session for a specific text
 */
export const useReviewSession = (textId: number, enabled = true) => {
  return useQuery<ReviewSessionResponse>({
    queryKey: queryKeys.reviews.session(textId),
    queryFn: () => reviewApi.startReviewSession(textId),
    enabled,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

/**
 * Get review status for a specific text
 */
export const useReviewStatus = (textId: number, enabled = true) => {
  return useQuery<ReviewStatus>({
    queryKey: queryKeys.reviews.status(textId),
    queryFn: () => reviewApi.getReviewStatus(textId),
    enabled,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Get all reviews by the current reviewer
 */
export const useMyReviews = (filters?: { skip?: number; limit?: number }) => {
  return useQuery<AnnotationReviewResponse[]>({
    queryKey: [...queryKeys.reviews.myReviews, filters],
    queryFn: () => reviewApi.getMyReviews(filters),
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get all reviews for a specific annotation
 */
export const useAnnotationReviews = (annotationId: number, enabled = true) => {
  return useQuery<AnnotationReviewResponse[]>({
    queryKey: queryKeys.reviews.annotationReviews(annotationId),
    queryFn: () => reviewApi.getAnnotationReviews(annotationId),
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get statistics for the current reviewer
 */
export const useReviewerStats = () => {
  return useQuery<ReviewerStats>({
    queryKey: queryKeys.reviews.stats,
    queryFn: () => reviewApi.getReviewerStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};



/**
 * Get texts that need revision (for annotators)
 */
export const useTextsNeedingRevision = (skip = 0, limit = 100) => {
  return useQuery<TextNeedingRevision[]>({
    queryKey: [...queryKeys.reviews.textsNeedingRevision, skip, limit],
    queryFn: () => reviewApi.getTextsNeedingRevision(skip, limit),
    staleTime: 1000 * 60, // 1 minute
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Submit review decisions for a text
 */
export const useSubmitReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewData: ReviewSubmission) => reviewApi.submitReview(reviewData),
    onSuccess: (response: ReviewSubmissionResponse) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.forReview });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.myProgress });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.reviews.session(response.text_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.reviews.status(response.text_id) 
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.myReviews });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.stats });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.texts.detail(response.text_id) 
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.forReview });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.annotations.byText(response.text_id) 
      });
    },
  });
};

/**
 * Review a specific annotation (auto-save individual reviews)
 */
export const useReviewAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      annotationId,
      decision,
      comment,
    }: {
      annotationId: number;
      decision: "agree" | "disagree";
      comment?: string;
    }) => reviewApi.reviewAnnotation(annotationId, decision, comment),
    onSuccess: (response: AnnotationReviewResponse) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.reviews.annotationReviews(response.annotation_id) 
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.myReviews });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.stats });
    },
  });
};

/**
 * Delete a review
 */
export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: number) => reviewApi.deleteReview(reviewId),
    onSuccess: () => {
      // Invalidate all review queries
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.myReviews });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.stats });
    },
  });
};

/**
 * Auto-save review (alias for useReviewAnnotation for clarity)
 */
export const useAutoSaveReview = useReviewAnnotation;

/**
 * Start reviewing - fetches the first available text for review
 */
export const useStartReviewing = () => {
  return useMutation({
    mutationFn: async (limit: number = 1) => {
      const texts = await reviewApi.getTextsForReview({ limit });
      if (texts.length === 0) {
        throw new Error("No texts available for review at this time");
      }
      return texts[0];
    },
  });
};

