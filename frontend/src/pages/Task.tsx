import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAnnotationStore } from "@/store/annotation";
import { TextAnnotator } from "@/components/TextAnnotator";
import { useAnnotationFiltersStore } from "@/store/annotationFilters";
import { AnnotationSidebar } from "@/components/AnnotationSidebar/AnnotationSidebar";
import { NavigationModeSelector } from "@/components/NavigationModeSelector";
import Navbar from "@/components/Navbar";
import ActionButtons from "@/components/ActionButtons";
import { SkipConfirmationDialog } from "@/components/SkipConfirmationDialog";
import { AnnotationColorSettings } from "@/components/AnnotationColorSettings";
import { TaskLoadingState, TaskErrorState } from "@/components/Task";
import { useAuth } from "@/auth/use-auth-hook";
import {
  useTextWithAnnotations,
  useRecentActivity,
  useAnnotationListHierarchical,
  useCurrentUser,
  useSoftDeleteMyText,
} from "@/hooks";
import { convertApiAnnotationsSync } from "@/utils/annotationConverter";
import type { Annotation } from "@/utils/annotationConverter";
import { useAnnotationOperations } from "@/hooks/useAnnotationOperations";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useAnnotationNavigation } from "@/hooks/useAnnotationNavigation";
import { exportAsJsonFile, exportAsTeiXmlFile } from "@/utils/exportAnnotation";

const Index = () => {
  const { textId } = useParams<{ textId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { data: currentUserData } = useCurrentUser();

  // Parse textId early for all hooks
  const parsedTextId = textId ? parseInt(textId, 10) : undefined;
  const currentUserId = currentUser?.id ? parseInt(currentUser.id, 10) : null;
  const userRole = currentUserData?.role;

  // Global state from Zustand stores
  const { navigationOpen, sidebarOpen, toggleNavigation, toggleSidebar } = useAnnotationStore();
  const {
    selectedAnnotationListType,
    selectedAnnotationTypes,
    addSelectedAnnotationTypes,
  } = useAnnotationFiltersStore();
  const location = useLocation();

  // UI-only selection state
  const [selectedText, setSelectedText] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);
  const [allAnnotationsAccepted, setAllAnnotationsAccepted] = useState(false);

  // Fetch text data with annotations
  const {
    data: textData,
    isLoading,
    isError,
    error,
  } = useTextWithAnnotations(parsedTextId || 0, !!parsedTextId && !isNaN(parsedTextId));

  // Fetch annotation list for validation
  const { data: annotationList } = useAnnotationListHierarchical({
    type_id: selectedAnnotationListType,
    enabled: !!selectedAnnotationListType,
  });

  // Fetch recent activity for acceptance status
  const { data: recentActivityData } = useRecentActivity(10);

  // Derive text content from data
  const text = textData?.content || "";
  const translation = textData?.translation || "";
  const hasTranslation = Boolean(translation && translation.trim().length > 0);

  // Check if this is a completed task
  const isCompletedTask = textData && (textData.status === "annotated" || textData.status === "reviewed");

  // Determine if text should be read-only
  const isReadOnly = allAnnotationsAccepted || !textData;

  // Derive UI annotations directly from query data (no local duplication)
  const annotationsForUI: Annotation[] = useMemo(() => {
    return textData?.annotations ? convertApiAnnotationsSync(textData.annotations) : [];
  }, [textData]);

  /**
   * Custom hook: Annotation CRUD operations
   * Handles creating, updating, deleting annotations with optimistic updates
   */
  const {
    addAnnotation: addAnnotationFn,
    updateAnnotation,
    removeAnnotation,
    handleHeaderSelected,
    handleUpdateHeaderSpan,
    isCreatingAnnotation,
    isDeletingAnnotation,
  } = useAnnotationOperations(textId, text, currentUserId, annotationList);

  /**
   * Custom hook: Task lifecycle operations
   * Handles task submission, skipping, reverting, and undo
   */
  const {
    handleSubmitTask,
    handleSkipText,
    handleConfirmSkip,
    handleCancelSkip,
    handleRevertWork,
    handleUndoAnnotations,
    getUserAnnotationsCount,
    showSkipConfirmation,
    isSubmitting,
    isSkipping,
    isUndoing,
  } = useTaskOperations(parsedTextId, annotationsForUI, currentUserId, isCompletedTask || false);

  /**
   * Custom hook: Annotation navigation
   * Handles scrolling to annotations and URL-based navigation
   */
  const { textAnnotatorRef, highlightedAnnotationId, handleAnnotationClick } = useAnnotationNavigation(annotationsForUI);

  const softDeleteMutation = useSoftDeleteMyText({
    onSuccess: () => navigate("/"),
  });

  /**
   * Effect: Add annotation types from XML upload to selected filter so markings show
   */
  useEffect(() => {
    const types = (location.state as { annotationTypesToSelect?: string[] } | null)
      ?.annotationTypesToSelect;
    if (types?.length) {
      addSelectedAnnotationTypes(types);
    }
  }, [location.state, addSelectedAnnotationTypes]);

  /**
   * Effect: Check annotation acceptance status from recent activity
   */
  useEffect(() => {
    if (recentActivityData && textId) {
      const currentTextActivity = recentActivityData.find(
        (activity) => activity.text.id === parseInt(textId, 10)
      );
      if (currentTextActivity) {
        setAllAnnotationsAccepted(currentTextActivity.all_accepted);
      } else {
        setAllAnnotationsAccepted(false);
      }
    }
  }, [recentActivityData, textId]);

  /**
   * Wrapper for addAnnotation that handles selectedText state
   */
  const handleAddAnnotation = (type: string, name?: string, level?: string) => {
    if (!selectedText) return;
    addAnnotationFn(selectedText, type, name, level);
    setSelectedText(null);
  };

  /**
   * Memoized filtered annotations based on selected types
   * Always includes headers regardless of filter
   */
  const filteredAnnotations = useMemo(() => {
    return annotationsForUI.filter(
      (ann) => ann.type === "header" || selectedAnnotationTypes.has(ann.type)
    );
  }, [annotationsForUI, selectedAnnotationTypes]);

  /**
   * Annotations without headers (for sidebar display)
   */
  const annotationsWithoutHeader = useMemo(() => {
    return filteredAnnotations.filter((ann) => ann.type !== "header");
  }, [filteredAnnotations]);

  const dbUserId = currentUserData?.id;
  const canDeleteMyText =
    !!parsedTextId &&
    !!textData &&
    dbUserId !== undefined &&
    dbUserId !== null &&
    textData.uploaded_by === dbUserId;

  const handleDeleteMyText = () => {
    if (!parsedTextId || !canDeleteMyText) return;
    if (!window.confirm(`Are you sure you want to delete "${textData?.title}"? This cannot be undone.`)) return;
    softDeleteMutation.mutate(parsedTextId);
  };

  /**
   * Handle export for regular users (JSON or TEI XML)
   */
  const handleExport = (format: "json" | "tei") => {
    if (!textData) return;
    if (format === "json") {
      exportAsJsonFile(textData);
    } else {
      exportAsTeiXmlFile(textData);
    }
  };

  // Loading state
  if (isLoading) {
    return <TaskLoadingState />;
  }

  // Error state
  if (isError) {
    return <TaskErrorState error={error} />;
  }

  // No data state
  if (!textData) {
    return <TaskErrorState error={new Error("No text data available")} />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <Navbar textTitle={textData?.title} />

      <div className="flex w-full gap-6 flex-1 px-6 mx-auto overflow-hidden">
        {/* Left Sidebar: Navigation (Error List + Table of Contents) */}
        <NavigationModeSelector
          isOpen={navigationOpen}
          onToggle={toggleNavigation}
          onErrorSelect={(error) => {
            console.warn("Selected error:", error);
          }}
          searchable={true}
        />

        {/* Main Content Area: Text Annotator */}
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
              onAddAnnotation={handleAddAnnotation}
              onRemoveAnnotation={removeAnnotation}
              onUpdateAnnotation={updateAnnotation}
              onHeaderSelected={handleHeaderSelected}
              onUpdateHeaderSpan={handleUpdateHeaderSpan}
              readOnly={isReadOnly}
              isCreatingAnnotation={isCreatingAnnotation}
              isDeletingAnnotation={isDeletingAnnotation}
              highlightedAnnotationId={highlightedAnnotationId}
              textId={parsedTextId}
            />
          </div>
        </div>

        {/* Right Sidebar: Action Buttons + Annotation List */}
        <div className="w-80 flex flex-col gap-4 h-[90vh] mt-4 mb-4 overflow-y-hidden">
          <ActionButtons
            annotations={annotationsForUI}
            onSubmitTask={handleSubmitTask}
            isSubmitting={isSubmitting}
            isCompletedTask={isCompletedTask}
            onSkipText={handleSkipText}
            isSkipping={isSkipping}
            isUndoing={isUndoing}
            onUndoAnnotations={handleUndoAnnotations}
            onRevertWork={handleRevertWork}
            onExport={handleExport}
            onDeleteMyText={handleDeleteMyText}
            canDeleteMyText={canDeleteMyText}
            isDeletingText={softDeleteMutation.isPending}
            textData={textData}
            userRole={userRole}
            userAnnotationsCount={getUserAnnotationsCount()}
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

      {/* Dialogs and Floating UI */}
      <SkipConfirmationDialog
        isOpen={showSkipConfirmation}
        onConfirm={handleConfirmSkip}
        onCancel={handleCancelSkip}
        textTitle={textData?.title}
        isSkipping={isSkipping}
      />

      {/* Floating annotation color settings */}
      <AnnotationColorSettings />
    </div>
  );
};

export default Index;
