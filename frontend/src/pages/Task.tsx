import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TextAnnotator } from "@/components/TextAnnotator";
import type { TextAnnotatorRef } from "@/components/TextAnnotator";
import { AnnotationSidebar } from "@/components/AnnotationSidebar";
import { TableOfContents } from "@/components/TableOfContents";
import { useToast } from "@/hooks/use-toast";
import { text_temp } from "@/data/text.ts";
import Navbar from "@/components/Navbar";
import ActionButtons from "@/components/ActionButtons";
import { useParams, useNavigate } from "react-router-dom";
import { textApi } from "@/api/text";
import { annotationsApi } from "@/api/annotations";
import type {
  AnnotationResponse,
  AnnotationCreate,
  TaskSubmissionResponse,
} from "@/api/types";
import {
  loadAnnotationConfig,
  isValidAnnotationType,
} from "@/config/annotation-options";

export type Annotation = {
  id: string;
  type: string;
  text: string;
  start: number;
  end: number;
  name?: string; // Custom name for the annotation
};

const Index = () => {
  const { textId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    return apiAnnotations.map((ann) => ({
      id: ann.id.toString(),
      type: ann.annotation_type,
      text: ann.selected_text || "",
      start: ann.start_position,
      end: ann.end_position,
      name: ann.name,
    }));
  };

  // State for local annotations and UI
  const [text, setText] = useState(text_temp);
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

  // Update local state when textData is loaded
  useEffect(() => {
    if (textData) {
      setText(textData.content);
      const convertedAnnotations = convertApiAnnotations(textData.annotations);

      setAnnotations(convertedAnnotations);
    }
  }, [textData]);
  // Mutation for creating annotations
  const createAnnotationMutation = useMutation({
    mutationFn: async (annotationData: AnnotationCreate) => {
      return annotationsApi.createAnnotation(annotationData);
    },
    onSuccess: (data) => {
      // Add the new annotation to local state
      const newAnnotation: Annotation = {
        id: data.id.toString(),
        type: data.annotation_type,
        text: data.selected_text || "",
        start: data.start_position,
        end: data.end_position,
        name: data.name,
      };
      setAnnotations((prev) => [...prev, newAnnotation]);

      // Refresh the text data to get updated annotations
      queryClient.invalidateQueries({ queryKey: ["text", textId] });
      // Refresh user stats (affects total annotations count)
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
    onSuccess: (_, annotationId) => {
      // Remove annotation from local state
      setAnnotations((prev) =>
        prev.filter((ann) => ann.id !== annotationId.toString())
      );

      // Refresh the text data
      queryClient.invalidateQueries({ queryKey: ["text", textId] });
      // Refresh user stats (affects total annotations count)
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
      // Refresh the text data to reflect updates
      queryClient.invalidateQueries({ queryKey: ["text", textId] });
      // Refresh user stats and recent activity
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

    // Save to database immediately
    createAnnotationMutation.mutate(annotationData);
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
    createAnnotationMutation.mutate(annotationData);
    setPendingHeader(null);
  };

  const handleHeaderNameCancel = () => {
    setPendingHeader(null);
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

    // Delete from database immediately
    deleteAnnotationMutation.mutate(annotationIdNumber);
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

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
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
        <div className="flex items-center justify-center h-96">
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
        <div className="flex items-center justify-center h-96">
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

      <div className="flex gap-6 justify-center  mx-auto relative">
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
            setText={setText}
            annotations={annotations}
            selectedText={selectedText}
            onTextSelect={setSelectedText}
            onAddAnnotation={addAnnotation}
            onRemoveAnnotation={removeAnnotation}
            onHeaderSelected={handleHeaderSelected}
            readOnly={isCompletedTask}
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
          />
          <AnnotationSidebar
            annotations={annotationsWithoutHeader}
            onRemoveAnnotation={removeAnnotation}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
