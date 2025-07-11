import { useCallback } from "react";

// Define all trackable event types
export type UmamiEventType =
  // Annotation actions
  | "annotation-created"
  | "annotation-deleted"
  | "annotation-updated"
  | "text-selected"
  | "bubble-menu-opened"
  | "bubble-menu-closed"

  // Task actions
  | "task-submitted"
  | "task-skipped"
  | "task-reverted"
  | "annotations-undone"
  | "task-started"
  | "task-completed"

  // Navigation actions
  | "page-visited"
  | "dashboard-opened"
  | "editor-opened"
  | "search-opened"
  | "search-closed"

  // User management actions
  | "user-role-changed"
  | "user-status-changed"
  | "user-deleted"
  | "user-created"

  // Bulk upload actions
  | "bulk-upload-started"
  | "bulk-upload-completed"
  | "files-validated"
  | "file-uploaded"

  // Search actions
  | "search-performed"
  | "search-result-selected"
  | "search-navigation"

  // UI interactions
  | "sidebar-toggled"
  | "table-of-contents-toggled"
  | "modal-opened"
  | "modal-closed"
  | "button-clicked"
  | "dropdown-opened"
  | "tab-changed";

// Event properties interface
interface UmamiEventProperties {
  // Common properties
  user_id?: string;
  user_role?: string;
  page_path?: string;
  timestamp?: number;
  session_id?: string;

  // Annotation-specific properties
  annotation_type?: string;
  annotation_id?: string;
  text_id?: string;
  text_length?: number;
  selection_length?: number;

  // Task-specific properties
  task_id?: string;
  task_type?: string;
  annotations_count?: number;
  task_duration?: number;
  completion_status?: string;

  // Navigation properties
  from_page?: string;
  to_page?: string;
  navigation_type?: string;

  // User management properties
  target_user_id?: string;
  old_role?: string;
  new_role?: string;
  old_status?: string;
  new_status?: string;

  // Bulk upload properties
  files_count?: number;
  successful_files?: number;
  failed_files?: number;
  total_annotations?: number;

  // Search properties
  search_query?: string;
  search_results_count?: number;
  search_type?: string;
  result_index?: number;

  // UI properties
  component_name?: string;
  action_type?: string;
  element_type?: string;
  element_id?: string;
  modal_type?: string;
  sidebar_type?: string;

  // Performance properties
  load_time?: number;
  response_time?: number;

  // Error properties
  error_message?: string;
  error_type?: string;

  // Additional context
  metadata?: Record<string, string | number | boolean | null>;
}

// Umami tracking function type
declare global {
  interface Window {
    umami?: {
      track: (
        event: string,
        properties?: Record<string, string | number | boolean | null>
      ) => void;
    };
  }
}

/**
 * Custom hook for umami analytics tracking
 * Provides a clean interface for tracking user interactions
 */
export const useUmamiTracking = () => {
  const track = useCallback(
    (eventType: UmamiEventType, properties: UmamiEventProperties = {}) => {
      // Add default properties
      const defaultProperties: UmamiEventProperties = {
        timestamp: Date.now(),
        page_path: window.location.pathname,
        session_id: generateSessionId(),
        ...properties,
      };

      // Track with umami if available
      if (window.umami?.track) {
        // Convert properties to the expected format
        const convertedProperties: Record<
          string,
          string | number | boolean | null
        > = {};
        Object.entries(defaultProperties).forEach(([key, value]) => {
          if (value !== undefined) {
            convertedProperties[key] = value;
          }
        });
        window.umami.track(eventType, convertedProperties);
      }
    },
    []
  );

  // Annotation tracking methods
  const trackAnnotationCreated = useCallback(
    (
      annotationType: string,
      textId: string,
      selectionLength: number,
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("annotation-created", {
        annotation_type: annotationType,
        text_id: textId,
        selection_length: selectionLength,
        ...properties,
      });
    },
    [track]
  );

  const trackAnnotationDeleted = useCallback(
    (
      annotationId: string,
      annotationType: string,
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("annotation-deleted", {
        annotation_id: annotationId,
        annotation_type: annotationType,
        ...properties,
      });
    },
    [track]
  );

  const trackTextSelected = useCallback(
    (
      textLength: number,
      selectionLength: number,
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("text-selected", {
        text_length: textLength,
        selection_length: selectionLength,
        ...properties,
      });
    },
    [track]
  );

  // Task tracking methods
  const trackTaskSubmitted = useCallback(
    (
      taskId: string,
      annotationsCount: number,
      taskDuration: number,
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("task-submitted", {
        task_id: taskId,
        annotations_count: annotationsCount,
        task_duration: taskDuration,
        completion_status: "completed",
        ...properties,
      });
    },
    [track]
  );

  const trackTaskSkipped = useCallback(
    (
      taskId: string,
      reason?: string,
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("task-skipped", {
        task_id: taskId,
        completion_status: "skipped",
        metadata: reason ? { reason } : undefined,
        ...properties,
      });
    },
    [track]
  );

  const trackTaskReverted = useCallback(
    (
      taskId: string,
      annotationsCount: number,
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("task-reverted", {
        task_id: taskId,
        annotations_count: annotationsCount,
        ...properties,
      });
    },
    [track]
  );

  // Navigation tracking methods
  const trackPageVisit = useCallback(
    (
      pagePath: string,
      fromPage?: string,
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("page-visited", {
        page_path: pagePath,
        from_page: fromPage,
        navigation_type: "page_change",
        ...properties,
      });
    },
    [track]
  );

  const trackModalOpened = useCallback(
    (modalType: string, properties: Partial<UmamiEventProperties> = {}) => {
      track("modal-opened", {
        modal_type: modalType,
        ...properties,
      });
    },
    [track]
  );

  const trackModalClosed = useCallback(
    (modalType: string, properties: Partial<UmamiEventProperties> = {}) => {
      track("modal-closed", {
        modal_type: modalType,
        ...properties,
      });
    },
    [track]
  );

  // User management tracking methods
  const trackUserRoleChanged = useCallback(
    (
      targetUserId: string,
      oldRole: string,
      newRole: string,
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("user-role-changed", {
        target_user_id: targetUserId,
        old_role: oldRole,
        new_role: newRole,
        ...properties,
      });
    },
    [track]
  );

  const trackUserStatusChanged = useCallback(
    (
      targetUserId: string,
      oldStatus: string,
      newStatus: string,
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("user-status-changed", {
        target_user_id: targetUserId,
        old_status: oldStatus,
        new_status: newStatus,
        ...properties,
      });
    },
    [track]
  );

  const trackUserDeleted = useCallback(
    (targetUserId: string, properties: Partial<UmamiEventProperties> = {}) => {
      track("user-deleted", {
        target_user_id: targetUserId,
        ...properties,
      });
    },
    [track]
  );

  // Bulk upload tracking methods
  const trackBulkUploadStarted = useCallback(
    (filesCount: number, properties: Partial<UmamiEventProperties> = {}) => {
      track("bulk-upload-started", {
        files_count: filesCount,
        ...properties,
      });
    },
    [track]
  );

  const trackBulkUploadCompleted = useCallback(
    (
      filesCount: number,
      successfulFiles: number,
      failedFiles: number,
      totalAnnotations: number,
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("bulk-upload-completed", {
        files_count: filesCount,
        successful_files: successfulFiles,
        failed_files: failedFiles,
        total_annotations: totalAnnotations,
        ...properties,
      });
    },
    [track]
  );

  // Search tracking methods
  const trackSearchPerformed = useCallback(
    (
      searchQuery: string,
      searchResultsCount: number,
      searchType: string = "text",
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("search-performed", {
        search_query: searchQuery,
        search_results_count: searchResultsCount,
        search_type: searchType,
        ...properties,
      });
    },
    [track]
  );

  const trackSearchResultSelected = useCallback(
    (
      resultIndex: number,
      searchQuery: string,
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("search-result-selected", {
        result_index: resultIndex,
        search_query: searchQuery,
        ...properties,
      });
    },
    [track]
  );

  // UI interaction tracking methods
  const trackSidebarToggled = useCallback(
    (
      sidebarType: string,
      isOpen: boolean,
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("sidebar-toggled", {
        sidebar_type: sidebarType,
        metadata: { is_open: isOpen },
        ...properties,
      });
    },
    [track]
  );

  const trackButtonClicked = useCallback(
    (
      buttonType: string,
      elementId?: string,
      properties: Partial<UmamiEventProperties> = {}
    ) => {
      track("button-clicked", {
        element_type: "button",
        action_type: buttonType,
        element_id: elementId,
        ...properties,
      });
    },
    [track]
  );

  return {
    // Core tracking method
    track,

    // Annotation methods
    trackAnnotationCreated,
    trackAnnotationDeleted,
    trackTextSelected,

    // Task methods
    trackTaskSubmitted,
    trackTaskSkipped,
    trackTaskReverted,

    // Navigation methods
    trackPageVisit,
    trackModalOpened,
    trackModalClosed,

    // User management methods
    trackUserRoleChanged,
    trackUserStatusChanged,
    trackUserDeleted,

    // Bulk upload methods
    trackBulkUploadStarted,
    trackBulkUploadCompleted,

    // Search methods
    trackSearchPerformed,
    trackSearchResultSelected,

    // UI methods
    trackSidebarToggled,
    trackButtonClicked,
  };
};

// Helper function to generate session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to get user context
export const getUserContext = (
  currentUser: { id?: string | number; role?: string } | null
): Partial<UmamiEventProperties> => {
  if (!currentUser) return {};

  return {
    user_id: currentUser.id?.toString(),
    user_role: currentUser.role,
  };
};

// Helper function to measure performance
export const measurePerformance = (startTime: number): number => {
  return Date.now() - startTime;
};
