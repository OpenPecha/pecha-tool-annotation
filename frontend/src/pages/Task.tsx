import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TextAnnotator } from "@/components/TextAnnotator";
import type { TextAnnotatorRef } from "@/components/TextAnnotator";
import { AnnotationSidebar } from "@/components/AnnotationSidebar";
import { TableOfContents } from "@/components/TableOfContents";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import ActionButtons from "@/components/ActionButtons";
import { useParams, useNavigate } from "react-router-dom";
import { textApi } from "@/api/text";
import { annotationsApi } from "@/api/annotations";
import type {
  AnnotationResponse,
  AnnotationCreate,
  TaskSubmissionResponse,
  TextResponse,
} from "@/api/types";
import {
  loadAnnotationConfig,
  isValidAnnotationType,
} from "@/config/annotation-options";
import { SkipConfirmationDialog } from "@/components/SkipConfirmationDialog";
import { useAuth } from "@/auth/use-auth-hook";
import { useUmamiTracking, getUserContext } from "@/hooks/use-umami-tracking";

export type Annotation = {
  id: string;
  type: string;
  text: string;
  start: number;
  end: number;
  name?: string; // Custom name for the annotation
  annotator_id?: number; // ID of the user who created this annotation
};

const Index = () => {
  const { textId } = useParams<{ textId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { trackPageVisit } = useUmamiTracking();

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
  const convertApiAnnotations = (
    apiAnnotations: AnnotationResponse[]
  ): Annotation[] => {
    const converted = apiAnnotations.map((ann) => ({
      id: ann.id.toString(),
      type: ann.annotation_type,
      text: ann.selected_text || "",
      start: ann.start_position,
      end: ann.end_position,
      name: ann.name,
      annotator_id: ann.annotator_id,
    }));

    return converted;
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

  const [tocOpen, setTocOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const textAnnotatorRef = useRef<TextAnnotatorRef>(null);

  // Skip confirmation dialog state
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);

  // Get text content directly from textData (no state needed since it never changes)
  const text = textData?.content || "";

  // Update local state when textData is loaded
  useEffect(() => {
    if (textData) {
      const convertedAnnotations = convertApiAnnotations(textData.annotations);
      setAnnotations(convertedAnnotations);
    }
  }, [textData]);

  // Track page visit when component mounts
  useEffect(() => {
    if (textId) {
      trackPageVisit(
        `/task/${textId}`,
        document.referrer ? new URL(document.referrer).pathname : undefined,
        {
          ...getUserContext(currentUser),
          text_id: textId,
          metadata: {
            annotations_count: annotations.length,
          },
        }
      );
    }
  }, [textId, trackPageVisit, currentUser, annotations.length]);
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

  const addAnnotation = async (type: string, name?: string) => {
    if (!selectedText || !textId) return;

    // Load configuration and validate annotation type
    const config = await loadAnnotationConfig();
    if (!isValidAnnotationType(config, type)) {
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
                  annotator_id: data.annotator_id,
                }
              : ann
          )
        );
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
                  annotator_id: data.annotator_id,
                }
              : ann
          )
        );
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

  const removeAnnotation = (id: string) => {
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
      onError: () => {
        // Restore the annotation on error
        if (annotationToRemove) {
          setAnnotations((prev) => [...prev, annotationToRemove]);
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
    if (textAnnotatorRef.current) {
      textAnnotatorRef.current.scrollToPosition(
        annotation.start,
        annotation.end
      );
    }
  };

  const annotationsWithoutHeader = annotations.filter(
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

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="flex items-center justify-center h-96 pt-16">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="flex items-center justify-center h-96 pt-16">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="flex items-center justify-center h-96 pt-16">
          <div className="text-center">
            <p className="text-gray-600">No text data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      <div className="flex gap-6  justify-center mx-auto relative pt-20">
        {/* Table of Contents - Left Sidebar */}
        <TableOfContents
          annotations={annotations}
          onHeaderClick={handleHeaderClick}
          onRemoveAnnotation={removeAnnotation}
          isOpen={tocOpen}
          onToggle={() => setTocOpen(!tocOpen)}
          pendingHeader={pendingHeader}
          onHeaderNameSubmit={handleHeaderNameSubmit}
          onHeaderNameCancel={handleHeaderNameCancel}
        />

        {/* Main Content Area */}
        <div
          className={`flex-1  transition-all duration-300 ease-in-out min-w-0 max-w-5xl mx-auto ${
            tocOpen && sidebarOpen
              ? "mx-6"
              : tocOpen || sidebarOpen
              ? "mx-3"
              : "mx-0"
          }`}
          style={{
            marginLeft: tocOpen ? "0" : "60px",
            marginRight: sidebarOpen ? "0" : "60px",
          }}
        >
          <TextAnnotator
            ref={textAnnotatorRef}
            text={text}
            annotations={annotations}
            selectedText={selectedText}
            onTextSelect={setSelectedText}
            onAddAnnotation={addAnnotation}
            onRemoveAnnotation={removeAnnotation}
            onHeaderSelected={handleHeaderSelected}
            onUpdateHeaderSpan={handleUpdateHeaderSpan}
            readOnly={true}
            isCreatingAnnotation={createAnnotationMutation.isPending}
            isDeletingAnnotation={deleteAnnotationMutation.isPending}
          />
        </div>

        {/* Annotation Sidebar - Right Sidebar */}
        <div className="space-y-4">
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
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
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
    </div>
  );
};

export default Index;
