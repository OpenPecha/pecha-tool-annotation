import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import type { TextWithAnnotations } from "@/api/types";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Annotation } from "@/utils/annotationConverter";
import type { TextResponse, TaskSubmissionResponse, DeleteMyAnnotationsResponse } from "@/api/types";
import {
  useSubmitTask,
  useSkipText,
  useRevertWork,
  useUpdateTask,
  useDeleteMyAnnotationsForText,
} from "@/hooks";
import { TOAST_MESSAGES, NAVIGATION_DELAYS, CONFIRMATION_MESSAGES } from "@/constants/taskConstants";

/**
 * Custom hook that manages task lifecycle operations
 * Handles task submission, skipping, reverting, and undo operations
 * 
 * @param textId - ID of the current text
 * @param annotations - Current annotations array
 * @param currentUserId - ID of current user for ownership filtering
 * @param isCompletedTask - Whether the task is already completed
 */
export const useTaskOperations = (
  textId: number | undefined,
  annotations: Annotation[],
  currentUserId: number | null,
  isCompletedTask: boolean
) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);

  // Mutations
  const submitTaskMutation = useSubmitTask();
  const updateTaskMutation = useUpdateTask();
  const skipTextMutation = useSkipText();
  const revertWorkMutation = useRevertWork();
  const deleteMyAnnotationsMutation = useDeleteMyAnnotationsForText();

  /**
   * Submits or updates the task based on its current status
   */
  const handleSubmitTask = useCallback(() => {
    if (annotations.length === 0) {
      toast({
        title: TOAST_MESSAGES.NO_ANNOTATIONS,
        description: "Please add some annotations before submitting the task.",
      });
      return;
    }

    if (!textId) return;

    if (isCompletedTask) {
      // Update existing completed task
      updateTaskMutation.mutate(textId, {
        onSuccess: () => {
          toast({
            title: TOAST_MESSAGES.TASK_UPDATED,
            description: "Your changes have been saved successfully!",
          });
        },
        onError: (error) => {
          toast({
            title: TOAST_MESSAGES.TASK_UPDATE_FAILED,
            description: error instanceof Error ? error.message : "Failed to update task",
          });
        },
      });
    } else {
      // Submit new task
      submitTaskMutation.mutate(textId, {
        onSuccess: (response: TaskSubmissionResponse) => {
          toast({
            title: TOAST_MESSAGES.TASK_COMPLETED,
            description: response.message,
          });

          // Navigate to next task or dashboard
          if (response.next_task) {
            setTimeout(() => navigate(`/task/${response.next_task!.id}`), NAVIGATION_DELAYS.NEXT_TASK);
          } else {
            setTimeout(() => navigate("/"), NAVIGATION_DELAYS.DASHBOARD);
          }
        },
        onError: (error) => {
          toast({
            title: TOAST_MESSAGES.TASK_SUBMIT_FAILED,
            description: error instanceof Error ? error.message : "Failed to submit task",
          });
        },
      });
    }
  }, [annotations.length, textId, isCompletedTask, updateTaskMutation, submitTaskMutation, toast, navigate]);

  /**
   * Opens skip confirmation dialog
   */
  const handleSkipText = useCallback(() => {
    setShowSkipConfirmation(true);
  }, []);

  /**
   * Confirms and executes text skip
   */
  const handleConfirmSkip = useCallback(() => {
    setShowSkipConfirmation(false);
    skipTextMutation.mutate(undefined, {
      onSuccess: (nextText: TextResponse) => {
        toast({
          title: TOAST_MESSAGES.TEXT_SKIPPED,
          description: `This text won't be shown to you again. Moving to: "${nextText.title}"`,
        });

        navigate(`/task/${nextText.id}`);
      },
      onError: (error) => {
        let errorMessage = "Failed to skip text";
        let errorTitle: string = TOAST_MESSAGES.INVALID_TYPE;

        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error && typeof error === "object" && "detail" in error) {
          const apiError = error as { detail: string; status_code?: number };
          errorMessage = apiError.detail || "Failed to skip text";

          if (apiError.status_code === 404) {
            errorTitle = TOAST_MESSAGES.NO_MORE_TASKS;
            errorMessage = "No more texts available for annotation at this time.";
          }
        }

        toast({
          title: errorTitle,
          description: errorMessage,
        });

        if (errorTitle === TOAST_MESSAGES.NO_MORE_TASKS) {
          setTimeout(() => navigate("/"), NAVIGATION_DELAYS.DASHBOARD);
        }
      },
    });
  }, [skipTextMutation, toast, navigate]);

  /**
   * Cancels skip operation
   */
  const handleCancelSkip = useCallback(() => {
    setShowSkipConfirmation(false);
  }, []);

  /**
   * Reverts all work and makes text available for others
   */
  const handleRevertWork = useCallback(() => {
    if (window.confirm(CONFIRMATION_MESSAGES.REVERT_WORK)) {
      if (!textId) return;

      revertWorkMutation.mutate(textId, {
        onSuccess: (response) => {
          toast({
            title: TOAST_MESSAGES.WORK_REVERTED,
            description: response.message + " Text is now available for others.",
          });

          setTimeout(() => navigate("/"), NAVIGATION_DELAYS.NEXT_TASK);
        },
        onError: (error) => {
          toast({
            title: TOAST_MESSAGES.WORK_REVERT_FAILED,
            description: error instanceof Error ? error.message : "Failed to revert work",
          });
        },
      });
    }
  }, [textId, revertWorkMutation, toast, navigate]);

  /**
   * Undoes all annotations created by current user
   */
  const handleUndoAnnotations = useCallback(() => {
    if (!currentUserId) {
      toast({
        title: TOAST_MESSAGES.INVALID_TYPE,
        description: "Unable to identify current user.",
      });
      return;
    }

    if (!textId) {
      toast({
        title: TOAST_MESSAGES.INVALID_TYPE,
        description: "Unable to identify current text.",
      });
      return;
    }

    // Filter annotations made by current user
    const userAnnotations = annotations.filter(
      (annotation) =>
        annotation.annotator_id !== undefined &&
        annotation.annotator_id === currentUserId
    );

    if (userAnnotations.length === 0) {
      toast({
        title: TOAST_MESSAGES.NO_USER_ANNOTATIONS,
        description: "You have not created any annotations to undo.",
      });
      return;
    }

    if (window.confirm(CONFIRMATION_MESSAGES.UNDO_ANNOTATIONS(userAnnotations.length))) {
      // Optimistically update cache for text-with-annotations
      const cacheKey = queryKeys.texts.withAnnotations(textId);
      const previous = queryClient.getQueryData<TextWithAnnotations>(cacheKey);

      if (previous) {
        const filtered = {
          ...previous,
          annotations: previous.annotations.filter(
            (ann) => !(ann.annotator_id !== undefined && ann.annotator_id === currentUserId)
          ),
        } as TextWithAnnotations;
        queryClient.setQueryData<TextWithAnnotations>(cacheKey, filtered);
      }

      // Delete all user annotations in bulk
      deleteMyAnnotationsMutation.mutate(textId, {
        onSuccess: (response: DeleteMyAnnotationsResponse) => {
          toast({
            title: TOAST_MESSAGES.ANNOTATIONS_REMOVED,
            description: response.message || `All ${userAnnotations.length} of your annotations have been removed.`,
          });
        },
        onError: (error: Error) => {
          // Rollback optimistic update
          if (previous) {
            queryClient.setQueryData<TextWithAnnotations>(cacheKey, previous);
          }
          
          toast({
            title: "Failed to Delete Annotations",
            description: error.message || "Failed to delete your annotations",
          });
        },
        onSettled: () => {
          // Invalidate queries to ensure UI is in sync
          queryClient.invalidateQueries({ queryKey: cacheKey });
          queryClient.invalidateQueries({ queryKey: queryKeys.annotations.byText(textId) });
        },
      });
    }
  }, [currentUserId, textId, annotations, deleteMyAnnotationsMutation, queryClient, toast]);

  /**
   * Gets count of annotations created by current user
   */
  const getUserAnnotationsCount = useCallback((): number => {
    if (!currentUserId) return 0;
    
    return annotations.filter(
      (annotation) =>
        annotation.annotator_id !== undefined &&
        annotation.annotator_id === currentUserId
    ).length;
  }, [currentUserId, annotations]);

  return {
    // Functions
    handleSubmitTask,
    handleSkipText,
    handleConfirmSkip,
    handleCancelSkip,
    handleRevertWork,
    handleUndoAnnotations,
    getUserAnnotationsCount,
    
    // State
    showSkipConfirmation,
    
    // Loading states
    isSubmitting: submitTaskMutation.isPending || updateTaskMutation.isPending,
    isSkipping: skipTextMutation.isPending,
    isReverting: revertWorkMutation.isPending,
    isUndoing: deleteMyAnnotationsMutation.isPending,
  };
};

