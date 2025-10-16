/**
 * Constants for Task page operations
 * Centralizes magic values for better maintainability
 */

// Navigation timeouts
export const NAVIGATION_DELAYS = {
  NEXT_TASK: 1500, // Delay before navigating to next task
  DASHBOARD: 2000, // Delay before navigating to dashboard
  HIGHLIGHT_CLEAR: 3000, // Delay before clearing annotation highlight
} as const;

// Toast messages
export const TOAST_MESSAGES = {
  // Success messages
  ANNOTATION_CREATED: "✅ Annotation Created",
  ANNOTATION_UPDATED: "✅ Annotation Updated",
  ANNOTATION_DELETED: "✅ Annotation Deleted",
  TASK_COMPLETED: "✅ Task Completed",
  TASK_UPDATED: "✅ Task Updated",
  WORK_REVERTED: "✅ Work Reverted",
  HEADER_UPDATED: "✅ Header Updated",
  ANNOTATIONS_REMOVED: "✅ Your Annotations Removed",
  
  // Error messages
  ANNOTATION_CREATE_FAILED: "❌ Failed to Create Annotation",
  ANNOTATION_UPDATE_FAILED: "❌ Failed to Update Annotation",
  ANNOTATION_DELETE_FAILED: "❌ Failed to Delete Annotation",
  TASK_SUBMIT_FAILED: "❌ Failed to Submit Task",
  TASK_UPDATE_FAILED: "❌ Failed to Update Task",
  WORK_REVERT_FAILED: "❌ Failed to Revert Work",
  INVALID_TYPE: "❌ Error",
  
  // Warning messages
  NO_ANNOTATIONS: "⚠️ No Annotations",
  NO_USER_ANNOTATIONS: "⚠️ No User Annotations",
  ANNOTATION_NOT_FOUND: "⚠️ Annotation Not Found",
  HEADER_NOT_FOUND: "❌ Header Not Found",
  
  // Info messages
  CREATING_ANNOTATION: "📝 Creating annotation...",
  CREATING_HEADER: "📝 Creating header...",
  NAVIGATED_TO_ANNOTATION: "📍 Navigated to Annotation",
  TEXT_SKIPPED: "⏭️ Text Skipped & Rejected",
  NO_MORE_TASKS: "📝 No More Tasks",
  
  // Locked messages
  CANNOT_EDIT_AGREED: "🔒 Cannot Edit Annotation",
  CANNOT_DELETE_AGREED: "🔒 Cannot Delete Annotation",
} as const;

// Confirmation messages
export const CONFIRMATION_MESSAGES = {
  REVERT_WORK: "Are you sure you want to revert your work? This will remove all your annotations and make the text available for others to work on.",
  UNDO_ANNOTATIONS: (count: number) => 
    `Are you sure you want to remove all ${count} annotations you created? This action cannot be undone.`,
} as const;

