import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAnnotationStore } from "@/store/annotation";
import { TextAnnotator } from "@/components/TextAnnotator";
import type { TextAnnotatorRef } from "@/components/TextAnnotator";
import { useAnnotationFiltersStore } from "@/store/annotationFilters";
import { AnnotationSidebar } from "@/components/AnnotationSidebar/AnnotationSidebar";
import { NavigationModeSelector } from "@/components/NavigationModeSelector";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import ActionButtons from "@/components/ActionButtons";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { textApi } from "@/api/text";
import { annotationsApi } from "@/api/annotations";
import { reviewApi } from "@/api/reviews";
import type {
  AnnotationResponse,
  AnnotationCreate,
  TaskSubmissionResponse,
  TextResponse,
} from "@/api/types";
import type { AnnotationReviewResponse } from "@/api/reviews";
import {
  loadAnnotationConfig,
  extractLeafNodes,
  isValidAnnotationType,
} from "@/config/annotation-options";
import { useAnnotationListHierarchical } from "@/hooks/useAnnotationListHierarchical";
import { SkipConfirmationDialog } from "@/components/SkipConfirmationDialog";
import { AnnotationColorSettings } from "@/components/AnnotationColorSettings";
import { useAuth } from "@/auth/use-auth-hook";
import { queryKeys } from "@/constants/queryKeys";

export type Annotation = {
  id: string;
  type: string;
  text: string;
  start: number;
  end: number;
  name?: string; // Custom name for the annotation
  level?: "minor" | "major" | "critical"; // Importance level
  annotator_id?: number; // ID of the user who created this annotation
  is_agreed?: boolean; // Whether annotation has been agreed upon by a reviewer
  reviews?: Array<{
    id: number;
    decision: "agree" | "disagree";
    comment?: string;
    reviewer_id: number;
    created_at: string;
  }>; // Review comments from reviewers
};

const Index = () => {
  const { textId } = useParams<{ textId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const { selectedAnnotationListType, selectedAnnotationTypes, setSelectedAnnotationTypes } = useAnnotationFiltersStore();

  // React Query to fetch text data
  const {
    data: textData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["text", textId],
    queryFn: () => {
      if (!textId) {
        throw new Error("Text ID is required");
      }
      const id = parseInt(textId, 10);
      if (isNaN(id)) {
        throw new Error("Invalid text ID");
      }
      return textApi.getTextWithAnnotations(id);
    },
    refetchOnWindowFocus: false,
    enabled: !!textId, // Only run query if textId exists
  });

  // Convert API annotations to component format
  const convertApiAnnotations = async (
    apiAnnotations: AnnotationResponse[]
  ): Promise<Annotation[]> => {
    const annotationsWithReviews = await Promise.all(
      apiAnnotations.map(async (ann) => {
        let reviews: AnnotationReviewResponse[] = [];
        try {
          // Fetch reviews for this annotation
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
          level: ann.level, // Add the missing level field
          annotator_id: ann.annotator_id,
          is_agreed: ann.is_agreed,
          reviews: reviews,
        };
      })
    );

    return annotationsWithReviews;
  };

  // State for local annotations and UI
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedText, setSelectedText] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);
  const [pendingHeader, setPendingHeader] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);

  // Zustand store for annotation state
  const {
    navigationOpen,
    sidebarOpen,

    toggleNavigation,
    toggleSidebar,
  } = useAnnotationStore();
  const textAnnotatorRef = useRef<TextAnnotatorRef>(null);

  // Skip confirmation dialog state
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);

  // State for target annotation (from URL parameter)
  const [targetAnnotationId, setTargetAnnotationId] = useState<string | null>(
    null
  );
  const [hasScrolledToTarget, setHasScrolledToTarget] = useState(false);
  const [highlightedAnnotationId, setHighlightedAnnotationId] = useState<
    string | null
  >(null);

  // Check if all annotations are accepted (can't edit)
  const [allAnnotationsAccepted, setAllAnnotationsAccepted] = useState(false);

  // Get text content directly from textData (no state needed since it never changes)
  const text = textData?.content || "";
  const translation = textData?.translation || "";
  const hasTranslation = Boolean(translation && translation.trim().length > 0);

  const {
    data: annotationList,
  } = useAnnotationListHierarchical({
    type_id: selectedAnnotationListType,
    enabled: !!selectedAnnotationListType,
  });
  // Update local state when textData is loaded
  useEffect(() => {
    if (textData) {
      convertApiAnnotations(textData.annotations).then(
        (convertedAnnotations) => {
          setAnnotations(convertedAnnotations);
        }
      );
    }
  }, [textData]);

  // Check if all annotations are accepted when textData is loaded
  useEffect(() => {
    if (textData && textId) {
      // Fetch the activity status to check if all annotations are accepted
      textApi
        .getRecentActivity(10)
        .then((activities) => {
          const currentTextActivity = activities.find(
            (activity) => activity.text.id === parseInt(textId, 10)
          );
          if (currentTextActivity) {
            setAllAnnotationsAccepted(currentTextActivity.all_accepted);
          }
        })
        .catch(() => {
          // If we can't fetch activity, assume editing is allowed
          setAllAnnotationsAccepted(false);
        });
    }
  }, [textData, textId]);

  // Parse URL parameters to get target annotation ID
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const annotationId = urlParams.get("annotationId");
    if (annotationId) {
      setTargetAnnotationId(annotationId);
      setHasScrolledToTarget(false);
    }
  }, [location.search]);

  // Scroll to target annotation when annotations are loaded
  useEffect(() => {
    if (targetAnnotationId && annotations.length > 0 && !hasScrolledToTarget) {
      const targetAnnotation = annotations.find(
        (ann) => ann.id === targetAnnotationId
      );
      if (targetAnnotation) {
        // Scroll to the annotation using the text annotator ref
        if (textAnnotatorRef.current) {
          textAnnotatorRef.current.scrollToPosition(
            targetAnnotation.start,
            targetAnnotation.end
          );
        }

        // Highlight the target annotation
        setHighlightedAnnotationId(targetAnnotationId);

        // Show toast notification
        toast({
          title: "📍 Navigated to Annotation",
          description: `Found "${
            targetAnnotation.type
          }" annotation: "${targetAnnotation.text.substring(0, 50)}${
            targetAnnotation.text.length > 50 ? "..." : ""
          }"`,
        });

        // Mark as scrolled to prevent repeated scrolling
        setHasScrolledToTarget(true);

        // Clear the target annotation ID from URL after scrolling
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("annotationId");
        window.history.replaceState({}, "", newUrl.toString());

        // Clear highlighting after 3 seconds
        setTimeout(() => {
          setHighlightedAnnotationId(null);
        }, 3000);
      } else {
        // If annotation not found, show warning
        toast({
          title: "⚠️ Annotation Not Found",
          description: `Could not find annotation with ID: ${targetAnnotationId}`,
        });
        setTargetAnnotationId(null);
      }
    }
  }, [targetAnnotationId, annotations, hasScrolledToTarget, toast]);
  // Mutation for creating annotations
  const createAnnotationMutation = useMutation({
    mutationFn: async (annotationData: AnnotationCreate) => {
      return annotationsApi.createAnnotation(annotationData);
    },
    onSuccess: (data) => {
      // Only refresh user stats (affects total annotations count)
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });

      toast({
        title: "✅ Annotation Created",
        description: `${data.annotation_type} annotation saved to database`,
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Failed to Create Annotation",
        description:
          error instanceof Error ? error.message : "Failed to save annotation",
      });
    },
  });

  // Mutation for updating annotations
  const updateAnnotationMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      type: string;
      name?: string;
      level?: string;
    }) => {
      return annotationsApi.updateAnnotation(data.id, {
        annotation_type: data.type,
        name: data.name,
        level: data.level as "minor" | "major" | "critical" | undefined,
      });
    },
    onSuccess: (data) => {
      // Only refresh user stats (affects total annotations count)
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });

      toast({
        title: "✅ Annotation Updated",
        description: `${data.annotation_type} annotation updated successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Failed to Update Annotation",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update annotation",
      });
    },
  });

  // Mutation for deleting annotations
  const deleteAnnotationMutation = useMutation({
    mutationFn: async (annotationId: number) => {
      return annotationsApi.deleteAnnotation(annotationId);
    },
    onSuccess: () => {
      // Only refresh user stats (affects total annotations count)
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });

      toast({
        title: "✅ Annotation Deleted",
        description: "Annotation removed from database",
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Failed to Delete Annotation",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete annotation",
      });
    },
  });

  // Mutation for submitting task
  const submitTaskMutation = useMutation({
    mutationFn: async () => {
      if (!textId) throw new Error("Text ID is required");
      const id = parseInt(textId, 10);
      if (isNaN(id)) throw new Error("Invalid text ID");
      return textApi.submitTask(id);
    },
    onSuccess: (response: TaskSubmissionResponse) => {
      toast({
        title: "✅ Task Completed",
        description: response.message,
      });

      // Refresh user stats and recent activity
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });

      // If there's a next task, navigate to it immediately
      if (response.next_task) {
        setTimeout(() => navigate(`/task/${response.next_task!.id}`), 1500);
      } else {
        // No more tasks, navigate back to dashboard
        setTimeout(() => navigate("/"), 2000);
      }
    },
    onError: (error) => {
      toast({
        title: "❌ Failed to Submit Task",
        description:
          error instanceof Error ? error.message : "Failed to submit task",
      });
    },
  });

  // Mutation for skipping text
  const skipTextMutation = useMutation({
    mutationFn: async () => {
      return textApi.skipText();
    },
    onSuccess: (nextText: TextResponse) => {
      toast({
        title: "⏭️ Text Skipped & Rejected",
        description: `This text won't be shown to you again. Moving to: "${nextText.title}"`,
      });

      // Refresh user stats and recent activity
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });

      // Navigate to the next text
      navigate(`/task/${nextText.id}`);
    },
    onError: (error) => {
      // Extract error message from different error types
      let errorMessage = "Failed to skip text";
      let errorTitle = "❌ Error";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "detail" in error) {
        const apiError = error as { detail: string; status_code?: number };
        errorMessage = apiError.detail || "Failed to skip text";

        if (apiError.status_code === 404) {
          errorTitle = "📝 No More Tasks";
          errorMessage = "No more texts available for annotation at this time.";
        }
      }

      if (errorTitle.includes("No More Tasks")) {
        toast({
          title: errorTitle,
          description: errorMessage,
        });
        // Navigate to dashboard if no more tasks
        setTimeout(() => navigate("/"), 2000);
      } else {
        toast({
          title: errorTitle,
          description: errorMessage,
        });
      }
    },
  });

  // Mutation for reverting work (edit mode skip)
  const revertWorkMutation = useMutation({
    mutationFn: async () => {
      if (!textId) throw new Error("Text ID is required");
      const id = parseInt(textId, 10);
      if (isNaN(id)) throw new Error("Invalid text ID");
      return textApi.revertWork(id);
    },
    onSuccess: (response) => {
      toast({
        title: "✅ Work Reverted",
        description: response.message + " Text is now available for others.",
      });

      // Refresh user stats and recent activity
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["admin-text-statistics"] });

      // Navigate back to dashboard
      setTimeout(() => navigate("/"), 1500);
    },
    onError: (error) => {
      toast({
        title: "❌ Failed to Revert Work",
        description:
          error instanceof Error ? error.message : "Failed to revert work",
      });
    },
  });

  // Mutation for updating completed task
  const updateTaskMutation = useMutation({
    mutationFn: async () => {
      if (!textId) throw new Error("Text ID is required");
      const id = parseInt(textId, 10);
      if (isNaN(id)) throw new Error("Invalid text ID");
      return textApi.updateTask(id);
    },
    onSuccess: () => {
      toast({
        title: "✅ Task Updated",
        description: "Your changes have been saved successfully!",
      });
      // Refresh user stats and recent activity (no need to refresh text data)
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
    },
    onError: (error) => {
      toast({
        title: "❌ Failed to Update Task",
        description:
          error instanceof Error ? error.message : "Failed to update task",
      });
    },
  });

  const addAnnotation = async (type: string, name?: string, level?: string) => {
    if (!selectedText || !textId) return;

    // Validate annotation type based on current mode
    let isValidType = false;
    const currentMode = useAnnotationStore.getState().currentNavigationMode;

    if (currentMode === "table-of-contents") {
      // For TOC mode, check against structural annotation types
      const { STRUCTURAL_ANNOTATION_TYPES } = await import(
        "@/config/structural-annotations"
      );
      isValidType =
        STRUCTURAL_ANNOTATION_TYPES.some(
          (structuralType) => structuralType.id === type
        ) || type === "header";
    } else {
      // For error-list mode, check against error list configuration
      // const config = await loadAnnotationConfig("44347a16-696e-444c-a1bf-1754556217f0");
      
      const config = extractLeafNodes(annotationList?.categories || [], 0);
      console.log("config", config);
      isValidType = isValidAnnotationType({options: config}, type) || type === "header";
    }

    if (!isValidType) {
      toast({
        title: "❌ Error",
        description: "Invalid annotation type.",
      });
      return;
    }

    const textIdNumber = parseInt(textId, 10);
    if (isNaN(textIdNumber)) {
      toast({
        title: "❌ Error",
        description: "Invalid text ID. Cannot create annotation.",
      });
      return;
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create optimistic annotation for immediate UI feedback
    const optimisticAnnotation: Annotation = {
      id: tempId,
      type: type,
      text: selectedText.text,
      start: selectedText.start,
      end: selectedText.end,
      name: name,
      level: level as "minor" | "major" | "critical" | undefined,
      annotator_id: currentUser?.id ? parseInt(currentUser.id, 10) : undefined,
    };

    // Add annotation optimistically to local state for immediate visual feedback
    setAnnotations((prev) => [...prev, optimisticAnnotation]);

    // Show immediate feedback
    toast({
      title: "📝 Creating annotation...",
      description: `Adding ${type} annotation`,
    });

    // Create annotation data for API
    const annotationData: AnnotationCreate = {
      text_id: textIdNumber,
      annotation_type: type,
      start_position: selectedText.start,
      end_position: selectedText.end,
      selected_text: selectedText.text,
      confidence: 1.0,
      label: type,
      name: name,
      level: level as "minor" | "major" | "critical" | undefined,
      meta: {},
    };

    // Save to database
    createAnnotationMutation.mutate(annotationData, {
      onSuccess: (data) => {
        // Replace the optimistic annotation with the real one
        setAnnotations((prev) =>
          prev.map((ann) =>
            ann.id === tempId
              ? {
                  id: data.id.toString(),
                  type: data.annotation_type,
                  text: data.selected_text || "",
                  start: data.start_position,
                  end: data.end_position,
                  name: data.name,
                  level: data.level as
                    | "minor"
                    | "major"
                    | "critical"
                    | undefined,
                  annotator_id: data.annotator_id,
                }
              : ann
          )
        );

        // Invalidate annotations query to update the filter
        queryClient.invalidateQueries({ queryKey: queryKeys.annotations.byText(textId) });

        // Automatically check the annotation type in the filter
        if (data.annotation_type && !selectedAnnotationTypes.has(data.annotation_type)) {
          const newSelectedTypes = new Set(selectedAnnotationTypes);
          newSelectedTypes.add(data.annotation_type);
          setSelectedAnnotationTypes(newSelectedTypes);
        }
      },
      onError: () => {
        // Remove the optimistic annotation on error
        setAnnotations((prev) => prev.filter((ann) => ann.id !== tempId));
      },
    });
    setSelectedText(null);
  };

  const handleHeaderSelected = (selection: {
    text: string;
    start: number;
    end: number;
  }) => {
    setPendingHeader(selection);
    setSelectedText(null);
  };

  const handleHeaderNameSubmit = (name: string) => {
    if (!pendingHeader || !textId) return;

    const textIdNumber = parseInt(textId, 10);
    if (isNaN(textIdNumber)) {
      toast({
        title: "❌ Error",
        description: "Invalid text ID. Cannot create annotation.",
      });
      return;
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp-header-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create optimistic annotation for immediate UI feedback
    const optimisticAnnotation: Annotation = {
      id: tempId,
      type: "header",
      text: pendingHeader.text,
      start: pendingHeader.start,
      end: pendingHeader.end,
      name: name,
      annotator_id: currentUser?.id ? parseInt(currentUser.id, 10) : undefined,
    };

    // Add annotation optimistically to local state for immediate visual feedback
    setAnnotations((prev) => [...prev, optimisticAnnotation]);

    // Show immediate feedback
    toast({
      title: "📝 Creating header...",
      description: `Adding header "${name}"`,
    });

    // Create header annotation with custom name
    const annotationData: AnnotationCreate = {
      text_id: textIdNumber,
      annotation_type: "header",
      start_position: pendingHeader.start,
      end_position: pendingHeader.end,
      selected_text: pendingHeader.text,
      confidence: 1.0,
      label: "header",
      name: name,
      meta: {},
    };

    // Save to database
    createAnnotationMutation.mutate(annotationData, {
      onSuccess: (data) => {
        // Replace the optimistic annotation with the real one
        setAnnotations((prev) =>
          prev.map((ann) =>
            ann.id === tempId
              ? {
                  id: data.id.toString(),
                  type: data.annotation_type,
                  text: data.selected_text || "",
                  start: data.start_position,
                  end: data.end_position,
                  name: data.name,
                  level: data.level as
                    | "minor"
                    | "major"
                    | "critical"
                    | undefined,
                  annotator_id: data.annotator_id,
                }
              : ann
          )
        );

        // Invalidate annotations query to update the filter
        queryClient.invalidateQueries({ queryKey: ["annotationsByText", textId] });

        // Automatically check the annotation type in the filter
        if (data.annotation_type && !selectedAnnotationTypes.has(data.annotation_type)) {
          const newSelectedTypes = new Set(selectedAnnotationTypes);
          newSelectedTypes.add(data.annotation_type);
          setSelectedAnnotationTypes(newSelectedTypes);
        }
      },
      onError: () => {
        // Remove the optimistic annotation on error
        setAnnotations((prev) => prev.filter((ann) => ann.id !== tempId));
      },
    });
    setPendingHeader(null);
  };

  const handleHeaderNameCancel = () => {
    setPendingHeader(null);
  };

  const handleUpdateHeaderSpan = (
    headerId: string,
    newStart: number,
    newEnd: number
  ) => {
    // Find the existing header annotation
    const existingHeader = annotations.find(
      (annotation) => annotation.id === headerId && annotation.type === "header"
    );

    if (!existingHeader) {
      toast({
        title: "❌ Header Not Found",
        description: "Could not find the header to update.",
      });
      return;
    }

    // Get the new text span
    const newText = text.substring(newStart, newEnd);

    // Update the header annotation
    const updatedAnnotation = {
      ...existingHeader,
      start: newStart,
      end: newEnd,
      text: newText,
    };

    // Update the annotations array
    setAnnotations((prev) =>
      prev.map((annotation) =>
        annotation.id === headerId ? updatedAnnotation : annotation
      )
    );

    toast({
      title: "✅ Header Updated",
      description: `Header "${
        existingHeader.name || existingHeader.text
      }" span has been updated.`,
    });
  };

  const updateAnnotation = (
    annotationId: string,
    newType: string,
    newText?: string,
    newLevel?: string
  ) => {
    // Check if annotation is agreed upon by a reviewer
    const annotation = annotations.find((ann) => ann.id === annotationId);
    if (annotation?.is_agreed) {
      toast({
        title: "🔒 Cannot Edit Annotation",
        description:
          "This annotation has been agreed upon by a reviewer and cannot be edited.",
      });
      return;
    }

    const annotationIdNumber = parseInt(annotationId, 10);
    if (isNaN(annotationIdNumber)) {
      toast({
        title: "❌ Error",
        description: "Invalid annotation ID. Cannot update annotation.",
      });
      return;
    }

    if (!annotation) {
      toast({
        title: "❌ Error",
        description: "Annotation not found.",
      });
      return;
    }

    // Store original annotation for potential rollback
    const originalAnnotation = { ...annotation };

    // Update annotation optimistically in local state for immediate visual feedback
    setAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === annotationId
          ? {
              ...ann,
              type: newType,
              name: newText,
              level: newLevel as "minor" | "major" | "critical" | undefined,
            }
          : ann
      )
    );

    // Update in database
    updateAnnotationMutation.mutate(
      {
        id: annotationIdNumber,
        type: newType,
        name: newText,
        level: newLevel,
      },
      {
        onSuccess: (data) => {
          // Update local state with actual response data
          setAnnotations((prev) =>
            prev.map((ann) =>
              ann.id === annotationId
                ? {
                    ...ann,
                    type: data.annotation_type,
                    name: data.name,
                    level: data.level as
                      | "minor"
                      | "major"
                      | "critical"
                      | undefined,
                  }
                : ann
            )
          );

          // Invalidate annotations query to update the filter
          queryClient.invalidateQueries({ queryKey: queryKeys.annotations.byText(textId) });

          // Automatically check the annotation type in the filter
          if (data.annotation_type && !selectedAnnotationTypes.has(data.annotation_type)) {
            const newSelectedTypes = new Set(selectedAnnotationTypes);
            newSelectedTypes.add(data.annotation_type);
            setSelectedAnnotationTypes(newSelectedTypes);
          }
        },
        onError: () => {
          // Restore the original annotation on error
          setAnnotations((prev) =>
            prev.map((ann) =>
              ann.id === annotationId ? originalAnnotation : ann
            )
          );
        },
      }
    );
  };

  const removeAnnotation = (id: string) => {
    // Check if annotation is agreed upon by a reviewer
    const annotation = annotations.find((ann) => ann.id === id);
    if (annotation?.is_agreed) {
      toast({
        title: "🔒 Cannot Delete Annotation",
        description:
          "This annotation has been agreed upon by a reviewer and cannot be deleted.",
      });
      return;
    }

    const annotationIdNumber = parseInt(id, 10);
    if (isNaN(annotationIdNumber)) {
      toast({
        title: "❌ Error",
        description: "Invalid annotation ID. Cannot delete annotation.",
      });
      return;
    }

    // Store the annotation for potential rollback
    const annotationToRemove = annotations.find((ann) => ann.id === id);

    // Remove annotation optimistically from local state for immediate visual feedback
    setAnnotations((prev) => prev.filter((ann) => ann.id !== id));

    // Delete from database
    deleteAnnotationMutation.mutate(annotationIdNumber, {
      onSuccess: () => {
        // Invalidate annotations query to update the filter
        queryClient.invalidateQueries({ queryKey: queryKeys.annotations.byText(textId) });

      },
      onError: (error) => {
        // Restore the annotation on error
        if (annotationToRemove) {
          setAnnotations((prev) => [...prev, annotationToRemove]);
        }

        // Show specific error message for agreed annotations
        if (error instanceof Error && error.message.includes("agreed upon")) {
          toast({
            title: "🔒 Cannot Delete Annotation",
            description:
              "This annotation has been agreed upon by a reviewer and cannot be deleted.",
          });
        }
      },
    });
  };

  // Check if this is a completed task
  const isCompletedTask =
    textData &&
    (textData.status === "annotated" || textData.status === "reviewed");

  // New submit function that submits or updates the task
  const handleSubmitTask = () => {
    if (annotations.length === 0) {
      toast({
        title: "⚠️ No Annotations",
        description: "Please add some annotations before submitting the task.",
      });
      return;
    }

    // Use appropriate mutation based on task status
    if (isCompletedTask) {
      updateTaskMutation.mutate();
    } else {
      submitTaskMutation.mutate();
    }
  };

  const handleSkipText = () => {
    setShowSkipConfirmation(true);
  };

  const handleConfirmSkip = () => {
    setShowSkipConfirmation(false);
    skipTextMutation.mutate();
  };

  const handleCancelSkip = () => {
    setShowSkipConfirmation(false);
  };

  const handleRevertWork = () => {
    if (
      window.confirm(
        "Are you sure you want to revert your work? This will remove all your annotations and make the text available for others to work on."
      )
    ) {
      revertWorkMutation.mutate();
    }
  };

  const handleUndoAnnotations = () => {
    const currentUserId = currentUser?.id ? parseInt(currentUser.id, 10) : null;

    if (!currentUserId) {
      toast({
        title: "❌ Error",
        description: "Unable to identify current user.",
      });
      return;
    }

    // Filter annotations to only include those made by current user
    // Only include annotations that have an annotator_id and it matches current user
    const userAnnotations = annotations.filter(
      (annotation) =>
        annotation.annotator_id !== undefined &&
        annotation.annotator_id === currentUserId
    );

    if (userAnnotations.length === 0) {
      toast({
        title: "⚠️ No User Annotations",
        description: "You have not created any annotations to undo.",
      });
      return;
    }

    // Show confirmation dialog
    if (
      window.confirm(
        `Are you sure you want to remove all ${userAnnotations.length} annotations you created? This action cannot be undone.`
      )
    ) {
      // Remove only user's annotations by calling the delete mutation for each
      userAnnotations.forEach((annotation) => {
        const annotationIdNumber = parseInt(annotation.id, 10);
        if (!isNaN(annotationIdNumber)) {
          deleteAnnotationMutation.mutate(annotationIdNumber);
        }
      });

      toast({
        title: "✅ Your Annotations Removed",
        description: `All ${userAnnotations.length} of your annotations have been removed.`,
      });
    }
  };

  const handleHeaderClick = (annotation: Annotation) => {
    // Don't auto-scroll when clicking on table of contents items
    // User can manually navigate if needed
    console.log("Header clicked:", annotation.id, annotation.text);
  };

  const handleAnnotationClick = (annotation: Annotation) => {
    // Scroll to the annotation in the editor
    if (textAnnotatorRef.current) {
      textAnnotatorRef.current.scrollToPosition(
        annotation.start,
        annotation.end
      );
    }

    // Highlight the annotation
    setHighlightedAnnotationId(annotation.id);

    // Show toast notification
    toast({
      title: "📍 Navigated to Annotation",
      description: `Found "${
        annotation.type
      }" annotation: "${annotation.text.substring(0, 50)}${
        annotation.text.length > 50 ? "..." : ""
      }"`,
    });

    // Clear highlighting after 3 seconds
    setTimeout(() => {
      setHighlightedAnnotationId(null);
    }, 3000);
  };

  // Filter annotations based on selected annotation types
  const filteredAnnotations = useMemo(() => {
    
    // Otherwise, filter based on selected types
    // Always include headers (table of contents) regardless of filter
    return annotations.filter(
      (ann) => ann.type === "header" || selectedAnnotationTypes.has(ann.type)
    );
  }, [annotations, selectedAnnotationTypes]);

  const annotationsWithoutHeader = filteredAnnotations.filter(
    (ann) => ann.type !== "header"
  );

  // Get current user's annotations for undo button
  const currentUserId = currentUser?.id ? parseInt(currentUser.id, 10) : null;
  const userAnnotations = currentUserId
    ? annotations.filter(
        (annotation) =>
          annotation.annotator_id !== undefined &&
          annotation.annotator_id === currentUserId
      )
    : [];

  // Determine if text should be read-only
  const isReadOnly = allAnnotationsAccepted || !textData;

  // Handle loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading text...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (isError) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Error Loading Text
            </h2>
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : "Failed to load text"}
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where textData is not available
  if (!textData) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">No text data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <Navbar />

      <div className="flex w-full gap-6 flex-1 px-6 pt-16 mx-auto overflow-hidden">
        {/* Navigation Panel - Left Sidebar (Error List + Table of Contents) */}
        <NavigationModeSelector
          isOpen={navigationOpen}
          onToggle={toggleNavigation}
          onErrorSelect={(error) => {
            console.log("Selected error:", error);
          }}
          searchable={true}
          annotations={filteredAnnotations}
          onHeaderClick={handleHeaderClick}
          onRemoveAnnotation={removeAnnotation}
          pendingHeader={pendingHeader}
          onHeaderNameSubmit={handleHeaderNameSubmit}
          onHeaderNameCancel={handleHeaderNameCancel}
        />

        {/* Main Content Area */}
        <div
          className={`flex-1 transition-all duration-300 ease-in-out min-w-0 mx-auto ${
            navigationOpen && sidebarOpen
              ? "mx-6"
              : navigationOpen || sidebarOpen
              ? "mx-3"
              : "mx-0"
          }`}
          style={{
            marginLeft: navigationOpen ? "0" : "60px",
            marginRight: sidebarOpen ? "0" : "60px",
          }}
        >
          <div className="h-[90vh] mt-4 mb-4">
            <TextAnnotator
              ref={textAnnotatorRef}
              text={text}
              translation={translation}
              hasTranslation={hasTranslation}
              annotations={filteredAnnotations}
              selectedText={selectedText}
              onTextSelect={setSelectedText}
              onAddAnnotation={addAnnotation}
              onRemoveAnnotation={removeAnnotation}
              onUpdateAnnotation={updateAnnotation}
              onHeaderSelected={handleHeaderSelected}
              onUpdateHeaderSpan={handleUpdateHeaderSpan}
              readOnly={isReadOnly}
              isCreatingAnnotation={createAnnotationMutation.isPending}
              isDeletingAnnotation={deleteAnnotationMutation.isPending}
              highlightedAnnotationId={highlightedAnnotationId}
            />
          </div>
        </div>

        {/* Annotation Sidebar - Right Sidebar */}
        <div className="w-80 flex flex-col gap-4 h-[90vh] mt-4 mb-4 overflow-y-hidden">
          <ActionButtons
            annotations={annotations}
            onSubmitTask={handleSubmitTask}
            isSubmitting={
              submitTaskMutation.isPending || updateTaskMutation.isPending
            }
            isCompletedTask={isCompletedTask}
            onSkipText={handleSkipText}
            isSkipping={skipTextMutation.isPending}
            onUndoAnnotations={handleUndoAnnotations}
            onRevertWork={handleRevertWork}
            userAnnotationsCount={userAnnotations.length}
          />
          <AnnotationSidebar
            annotations={annotationsWithoutHeader}
            onRemoveAnnotation={removeAnnotation}
            onAnnotationClick={handleAnnotationClick}
            isOpen={sidebarOpen}
            onToggle={toggleSidebar}
          />
        </div>
      </div>
      <SkipConfirmationDialog
        isOpen={showSkipConfirmation}
        onConfirm={handleConfirmSkip}
        onCancel={handleCancelSkip}
        textTitle={textData?.title}
        isSkipping={skipTextMutation.isPending}
      />

      {/* Annotation Color Settings - Floating in bottom right */}
      <AnnotationColorSettings />
    </div>
  );
};

export default Index;
