import { apiClient } from "./utils";

// Review-related types
export interface ReviewDecision {
  annotation_id: number;
  decision: "agree" | "disagree";
  comment?: string;
}

export interface ReviewSubmission {
  text_id: number;
  decisions: ReviewDecision[];
}

export interface ReviewStatus {
  text_id: number;
  total_annotations: number;
  reviewed_annotations: number;
  pending_annotations: number;
  is_complete: boolean;
}

export interface AnnotationReviewResponse {
  id: number;
  annotation_id: number;
  reviewer_id: number;
  decision: "agree" | "disagree";
  comment?: string;
  created_at: string;
  updated_at?: string;
}

export interface ReviewSessionResponse {
  text_id: number;
  title: string;
  content: string;
  translation?: string;
  annotations: Array<{
    id: number;
    annotation_type: string;
    start_position: number;
    end_position: number;
    selected_text: string;
    label?: string;
    name?: string;
    meta?: Record<string, unknown>;
    confidence: number;
    annotator_id: number;
    review_status: {
      reviewed: boolean;
      decision?: "agree" | "disagree";
      comment?: string;
    };
  }>;
  review_status: ReviewStatus;
  existing_reviews: AnnotationReviewResponse[];
}

export interface ReviewSubmissionResponse {
  message: string;
  text_id: number;
  total_reviews: number;
  status: string;
  next_review_text?: {
    id: number;
    title: string;
    annotation_count: number;
  };
}

export interface TextForReview {
  id: number;
  title: string;
  content: string;
  language: string;
  status: string;
  annotator_id: number;
  created_at: string;
  updated_at?: string;
  annotation_count: number;
}

export interface ReviewProgressItem {
  id: number;
  title: string;
  content: string;
  language: string;
  status: string;
  annotator_id: number;
  reviewer_id: number;
  created_at: string;
  updated_at?: string;
  annotation_count: number;
  reviewed_count: number;
  progress_percentage: number;
  is_complete: boolean;
}

export interface ReviewerStats {
  total_reviews: number;
  agreed_reviews: number;
  disagreed_reviews: number;
  texts_reviewed: number;
  agreement_rate: number;
}


export interface TextNeedingRevision {
  id: number;
  title: string;
  status: string;
  reviewer_id: number;
  total_annotations: number;
  disagree_count: number;
  disagree_comments: string[];
  reviewed_at: string;
}

// Review API client
export const reviewApi = {
  // Get texts that are ready for review
  getTextsForReview: async (
    filters: { skip?: number; limit?: number } = {}
  ): Promise<TextForReview[]> => {
    return apiClient.get<TextForReview[]>("/reviews/texts-for-review", filters);
  },

  // Get reviewer's work in progress
  getMyReviewProgress: async (
    filters: { skip?: number; limit?: number } = {}
  ): Promise<ReviewProgressItem[]> => {
    return apiClient.get<ReviewProgressItem[]>(
      "/reviews/my-review-progress",
      filters
    );
  },

  // Start a review session for a specific text
  startReviewSession: async (
    textId: number
  ): Promise<ReviewSessionResponse> => {
    return apiClient.get<ReviewSessionResponse>(`/reviews/session/${textId}`);
  },

  // Get review status for a specific text
  getReviewStatus: async (textId: number): Promise<ReviewStatus> => {
    return apiClient.get<ReviewStatus>(`/reviews/status/${textId}`);
  },

  // Submit review decisions for a text
  submitReview: async (
    reviewData: ReviewSubmission
  ): Promise<ReviewSubmissionResponse> => {
    return apiClient.post<ReviewSubmissionResponse>(
      "/reviews/submit",
      reviewData
    );
  },

  // Review a specific annotation
  reviewAnnotation: async (
    annotationId: number,
    decision: "agree" | "disagree",
    comment?: string
  ): Promise<AnnotationReviewResponse> => {
    return apiClient.post<AnnotationReviewResponse>(
      `/reviews/annotation/${annotationId}`,
      {
        annotation_id: annotationId,
        decision,
        comment,
      }
    );
  },

  // Get all reviews for a specific annotation
  getAnnotationReviews: async (
    annotationId: number
  ): Promise<AnnotationReviewResponse[]> => {
    return apiClient.get<AnnotationReviewResponse[]>(
      `/reviews/annotation/${annotationId}`
    );
  },

  // Get all reviews by the current reviewer
  getMyReviews: async (
    filters: { skip?: number; limit?: number } = {}
  ): Promise<AnnotationReviewResponse[]> => {
    return apiClient.get<AnnotationReviewResponse[]>(
      "/reviews/my-reviews",
      filters
    );
  },

  // Get statistics for the current reviewer
  getReviewerStats: async (): Promise<ReviewerStats> => {
    return apiClient.get<ReviewerStats>("/reviews/stats");
  },

  // Delete a review
  deleteReview: async (reviewId: number): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/reviews/${reviewId}`);
  },



  async getTextsNeedingRevision(
    skip: number = 0,
    limit: number = 100
  ): Promise<TextNeedingRevision[]> {
    return await apiClient.get<TextNeedingRevision[]>(
      `/reviews/annotator/texts-need-revision?skip=${skip}&limit=${limit}`
    );
  },
};
