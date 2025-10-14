import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type {
  ReviewDecision,
  ReviewSubmission,
  ReviewSessionResponse,
} from "@/api/reviews";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableOfContents } from "@/components/TOC";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import {
  useReviewSession,
  useSubmitReview,
  useAutoSaveReview,
} from "@/hooks";
import {
  IoCheckmarkCircle as CheckCircle,
  IoCloseCircle as XCircle,
  IoChatbubbleEllipses as MessageCircle,
  IoEye as Eye,
  IoTimeOutline as Clock,
  IoWarning as AlertCircle,
  IoArrowForward as ArrowRight,
  IoCheckmark as Check,
  IoTime as Timer,
} from "react-icons/io5";
import { AiOutlineLoading3Quarters as Loader2 } from "react-icons/ai";

// Type for annotations compatible with TableOfContents
export type Annotation = {
  id: string;
  type: string;
  text: string;
  start: number;
  end: number;
  name?: string;
  annotator_id?: number;
};

const Review = () => {
  const { textId } = useParams<{ textId: string }>();
  const navigate = useNavigate();

  const [reviewDecisions, setReviewDecisions] = useState<
    Map<number, ReviewDecision>
  >(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tocOpen, setTocOpen] = useState(true);

  const [savingComments, setSavingComments] = useState<Set<number>>(new Set());
  const [savedComments, setSavedComments] = useState<Set<number>>(new Set());
  const [pendingSave, setPendingSave] = useState<Set<number>>(new Set());

  // Parse textId
  const parsedTextId = textId ? parseInt(textId, 10) : 0;

  // Fetch review session data
  const {
    data: reviewSession,
    isLoading,
    error,
  } = useReviewSession(parsedTextId, !!textId);

  // Initialize review decisions from existing reviews
  useEffect(() => {
    if (reviewSession) {
      const initialDecisions = new Map<number, ReviewDecision>();
      reviewSession.existing_reviews.forEach((review) => {
        initialDecisions.set(review.annotation_id, {
          annotation_id: review.annotation_id,
          decision: review.decision,
          comment: review.comment,
        });
      });
      setReviewDecisions(initialDecisions);
    }
  }, [reviewSession]);

  // Submit review mutation
  const submitReviewMutation = useSubmitReview();

  // Auto-save individual review decisions
  const autoSaveReviewMutation = useAutoSaveReview();

  // Ref to persist timeouts across renders
  const timeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  // Debounced auto-save function
  const debouncedAutoSave = useCallback(
    (
      annotationId: number,
      decision: "agree" | "disagree",
      comment?: string
    ) => {
      // Clear existing timeout for this annotation
      const existingTimeout = timeoutsRef.current.get(annotationId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Show pending save indicator
      setPendingSave((prev) => new Set(prev).add(annotationId));

      // Set new timeout
      const timeout = setTimeout(() => {
        setPendingSave((prev) => {
          const newSet = new Set(prev);
          newSet.delete(annotationId);
          return newSet;
        });
        autoSaveReviewMutation.mutate(
          { annotationId, decision, comment },
          {
            onMutate: () => {
              setSavingComments((prev) => new Set(prev).add(annotationId));
              setSavedComments((prev) => {
                const newSet = new Set(prev);
                newSet.delete(annotationId);
                return newSet;
              });
            },
            onSuccess: () => {
              setSavingComments((prev) => {
                const newSet = new Set(prev);
                newSet.delete(annotationId);
                return newSet;
              });
              setSavedComments((prev) => new Set(prev).add(annotationId));

              // Remove the "saved" indicator after 2 seconds
              setTimeout(() => {
                setSavedComments((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(annotationId);
                  return newSet;
                });
              }, 2000);
            },
            onError: () => {
              setSavingComments((prev) => {
                const newSet = new Set(prev);
                newSet.delete(annotationId);
                return newSet;
              });
            },
          }
        );
        timeoutsRef.current.delete(annotationId);
      }, 1000); // Auto-save after 1 second of inactivity

      timeoutsRef.current.set(annotationId, timeout);
    },
    [autoSaveReviewMutation]
  );

  const handleReviewDecision = (
    annotationId: number,
    decision: "agree" | "disagree",
    comment?: string
  ) => {
    setReviewDecisions(
      (prev) =>
        new Map(
          prev.set(annotationId, {
            annotation_id: annotationId,
            decision,
            comment,
          })
        )
    );

    // Remove from saved status
    setSavedComments((prev) => {
      const newSet = new Set(prev);
      newSet.delete(annotationId);
      return newSet;
    });

    // Remove from pending save status (will be re-added by debounce)
    setPendingSave((prev) => {
      const newSet = new Set(prev);
      newSet.delete(annotationId);
      return newSet;
    });

    // Auto-save the decision and comment
    debouncedAutoSave(annotationId, decision, comment);
  };

  const handleSubmitReview = async () => {
    if (!reviewSession) return;

    const decisions = Array.from(reviewDecisions.values());

    if (decisions.length !== reviewSession.review_status.total_annotations) {
      toast.error("Please review all annotations before submitting");
      return;
    }

    // Validate that all disagreed annotations have comments
    const disagreedWithoutComments = decisions.filter(
      (decision) =>
        decision.decision === "disagree" && !decision.comment?.trim()
    );

    if (disagreedWithoutComments.length > 0) {
      toast.error("Please provide comments for all disagreed annotations");
      return;
    }

    setIsSubmitting(true);

    const reviewData: ReviewSubmission = {
      text_id: reviewSession.text_id,
      decisions,
    };

    submitReviewMutation.mutate(reviewData, {
      onSuccess: (response) => {
        toast.success("Review submitted successfully!", {
          description: response.message,
        });

        // Navigate to next review or back to dashboard
        if (response.next_review_text) {
          navigate(`/review/${response.next_review_text.id}`);
        } else {
          navigate("/");
        }
      },
      onError: (error) => {
        toast.error("Failed to submit review", {
          description:
            error instanceof Error ? error.message : "Please try again",
        });
      },
      onSettled: () => {
        setIsSubmitting(false);
      },
    });
  };

  // Convert review session annotations to format expected by TableOfContents
  const convertToTocAnnotations = (
    annotations: ReviewSessionResponse["annotations"]
  ): Annotation[] => {
    return annotations.map((annotation) => ({
      id: annotation.id.toString(),
      type: annotation.annotation_type,
      text: annotation.selected_text,
      start: annotation.start_position,
      end: annotation.end_position,
      name: annotation.name,
      annotator_id: annotation.annotator_id,
    }));
  };

  // Handle header click in TOC - don't auto-scroll
  const handleHeaderClick = (annotation: Annotation) => {
    // Don't auto-scroll when clicking on table of contents items
    // User can manually navigate if needed
    console.log("Header clicked:", annotation.id, annotation.text);
  };

  // Handle annotation removal from TOC (disabled in review mode)
  const handleRemoveAnnotation = (id: string) => {
    // In review mode, we don't allow removing annotations
    // This function is required by TableOfContents but we'll make it a no-op
    console.log("Annotation removal not allowed in review mode:", id);
  };

  const renderAnnotationInText = (
    text: string,
    annotations: ReviewSessionResponse["annotations"]
  ) => {
    if (!annotations.length) return <p className="text-gray-700">{text}</p>;

    // Sort annotations by start position
    const sortedAnnotations = [...annotations].sort(
      (a, b) => a.start_position - b.start_position
    );

    let lastIndex = 0;
    const elements: React.ReactNode[] = [];

    sortedAnnotations.forEach((annotation, index) => {
      // Add text before this annotation
      if (lastIndex < annotation.start_position) {
        elements.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, annotation.start_position)}
          </span>
        );
      }

      // Add the annotation
      const reviewDecision = reviewDecisions.get(annotation.id);
      const isReviewed = reviewDecision !== undefined;
      const isAgreed = reviewDecision?.decision === "agree";

      elements.push(
        <span
          key={`annotation-${annotation.id}`}
          className={`
            px-1 py-0.5 rounded text-sm font-medium cursor-pointer
            ${
              isReviewed
                ? isAgreed
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-red-100 text-red-800 border border-red-200"
                : "bg-yellow-100 text-yellow-800 border border-yellow-200"
            }
          `}
          onClick={() => {
            const element = document.getElementById(
              `annotation-${annotation.id}`
            );
            element?.scrollIntoView({ behavior: "smooth" });
          }}
          title={`${annotation.annotation_type}: ${annotation.selected_text}`}
        >
          {annotation.selected_text}
        </span>
      );

      lastIndex = annotation.end_position;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(<span key="text-end">{text.slice(lastIndex)}</span>);
    }

    return <p className="text-gray-700 leading-[normal]">{elements}</p>;
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading review session...</span>
        </div>
      </div>
    );
  }

  if (error || !reviewSession) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Error Loading Review
            </h2>
            <p className="text-gray-600 mb-4">
              {error instanceof Error
                ? error.message
                : "Failed to load review session"}
            </p>
            <Button onClick={() => navigate("/")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { review_status, annotations } = reviewSession;
  const reviewedCount = reviewDecisions.size;
  const allReviewed = reviewedCount === review_status.total_annotations;

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 overflow-hidden px-6">
        {/* Header */}
        <div className="mb-6 flex-shrink-0 pt-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Review Text</h1>
              <p className="text-gray-600 mt-1">
                Review and validate annotations for:{" "}
                <span className="font-medium">{reviewSession.title}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reviewedCount}/{review_status.total_annotations}
                </p>
              </div>

              <Button
                onClick={handleSubmitReview}
                disabled={!allReviewed || isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Review
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  (reviewedCount / review_status.total_annotations) * 100
                }%`,
              }}
            />
          </div>
        </div>

        <div className="flex gap-6 flex-1 container mx-auto py-4">
          {/* Table of Contents - Left Sidebar */}
          <TableOfContents
            annotations={convertToTocAnnotations(annotations)}
            onHeaderClick={handleHeaderClick}
            onRemoveAnnotation={handleRemoveAnnotation}
            isOpen={tocOpen}
            onToggle={() => setTocOpen(!tocOpen)}
            readOnly={true}
          />

          {/* Main Content Area */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-6 gap-6">
            {/* Text Content */}
            <div className="lg:col-span-4">
              <div className="h-[90vh] mt-4 mb-4">
                {reviewSession.translation &&
                reviewSession.translation.trim() ? (
                  // Split view: Original and Translation side by side
                  <div className="flex h-full gap-2">
                    {/* Original Text */}
                    <Card className="flex-1 flex flex-col">
                      <CardHeader className="flex-shrink-0">
                        <CardTitle className="flex items-center gap-2">
                          <Eye className="w-5 h-5" />
                          Original Text
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full font-monlam">
                          {renderAnnotationInText(
                            reviewSession.content,
                            annotations
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Translation */}
                    <Card className="flex-1 flex flex-col">
                      <CardHeader className="flex-shrink-0">
                        <CardTitle className="flex items-center gap-2">
                          <Eye className="w-5 h-5" />
                          Translation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full font-monlam">
                          <p className="text-gray-700 leading-[normal]">
                            {reviewSession.translation}
                          </p>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  // Single view: Just original text
                  <Card className="h-full flex flex-col">
                    <CardHeader className="flex-shrink-0">
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Text Content
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full font-monlam">
                        {renderAnnotationInText(
                          reviewSession.content,
                          annotations
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Annotations Review Panel */}
            <div className="lg:col-span-2">
              <div className="h-[90vh] mt-4 mb-4">
                <Card className="h-full flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Annotations ({annotations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="space-y-4">
                        {annotations.map((annotation) => {
                          const reviewDecision = reviewDecisions.get(
                            annotation.id
                          );
                          const isReviewed = reviewDecision !== undefined;

                          return (
                            <div
                              key={annotation.id}
                              id={`annotation-${annotation.id}`}
                              className="border rounded-lg p-4 bg-white"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <Badge className="bg-gray-100 text-gray-800">
                                  {annotation.annotation_type}
                                </Badge>
                                {isReviewed ? (
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      {reviewDecision.decision === "agree" ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-red-600" />
                                      )}
                                      <span className="text-sm text-gray-500">
                                        {reviewDecision.decision === "agree"
                                          ? "Agreed"
                                          : "Disagreed"}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 text-yellow-600" />
                                    <span className="text-sm text-gray-500">
                                      Pending
                                    </span>
                                  </div>
                                )}
                              </div>

                              <p className="text-sm font-medium font-monlam mb-2">
                                "{annotation.selected_text}"
                              </p>

                              {annotation.name && (
                                <p className="text-xs text-gray-500 mb-2">
                                  Label: {annotation.name}
                                </p>
                              )}

                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant={
                                      reviewDecision?.decision === "agree"
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() =>
                                      handleReviewDecision(
                                        annotation.id,
                                        "agree"
                                      )
                                    }
                                    className={`flex-1 ${
                                      savedComments.has(annotation.id) &&
                                      reviewDecision?.decision === "agree"
                                        ? "ring-2 ring-green-200"
                                        : ""
                                    }`}
                                    disabled={savingComments.has(annotation.id)}
                                  >
                                    {savingComments.has(annotation.id) &&
                                    reviewDecision?.decision === "agree" ? (
                                      <Timer className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                    )}
                                    Agree
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={
                                      reviewDecision?.decision === "disagree"
                                        ? "destructive"
                                        : "outline"
                                    }
                                    onClick={() =>
                                      handleReviewDecision(
                                        annotation.id,
                                        "disagree"
                                      )
                                    }
                                    className={`flex-1 ${
                                      savedComments.has(annotation.id) &&
                                      reviewDecision?.decision === "disagree"
                                        ? "ring-2 ring-green-200"
                                        : ""
                                    }`}
                                    disabled={savingComments.has(annotation.id)}
                                  >
                                    {savingComments.has(annotation.id) &&
                                    reviewDecision?.decision === "disagree" ? (
                                      <Timer className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                      <XCircle className="w-4 h-4 mr-1" />
                                    )}
                                    Disagree
                                  </Button>
                                </div>

                                {isReviewed &&
                                  reviewDecision.decision === "disagree" && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-gray-700">
                                          Comment:
                                        </label>
                                        <span className="text-xs text-red-600 font-medium">
                                          better if you can explain!
                                        </span>
                                      </div>
                                      <div className="relative">
                                        <Textarea
                                          placeholder="Please explain why you disagree (required)..."
                                          value={reviewDecision.comment || ""}
                                          onChange={(e) =>
                                            handleReviewDecision(
                                              annotation.id,
                                              reviewDecision.decision,
                                              e.target.value
                                            )
                                          }
                                          className={`text-sm ${
                                            !reviewDecision.comment?.trim()
                                              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                              : ""
                                          }`}
                                          rows={3}
                                        />
                                        {pendingSave.has(annotation.id) && (
                                          <div className="absolute right-2 top-2">
                                            <Timer className="w-4 h-4 text-blue-600 animate-spin" />
                                          </div>
                                        )}
                                        {savedComments.has(annotation.id) && (
                                          <div className="absolute right-2 top-2">
                                            <Check className="w-4 h-4 text-green-600" />
                                          </div>
                                        )}
                                      </div>
                                      {!reviewDecision.comment?.trim() && (
                                        <p className="text-xs text-red-600">
                                          This field is required when
                                          disagreeing with an annotation
                                        </p>
                                      )}
                                    </div>
                                  )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Review;
