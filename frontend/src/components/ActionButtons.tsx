import { Button } from "./ui/button";
import type { Annotation } from "@/utils/annotationConverter";
import type { TextWithAnnotations, UserRole } from "@/api/types";
import {
  IoSend,
  IoPlaySkipForward,
  IoArrowUndo,
  IoRefresh,
  IoDownload,
} from "react-icons/io5";
import { useNavigate } from "react-router-dom";

function ActionButtons({
  annotations,
  onSubmitTask,
  onSkipText,
  onUndoAnnotations,
  onRevertWork,
  onExport,
  textData,
  userRole,
  userAnnotationsCount = 0,
  isSubmitting = false,
  isSkipping = false,
  isUndoing = false,
  isCompletedTask = false,
}: {
  readonly annotations: Annotation[];
  readonly onSubmitTask: () => void;
  readonly onSkipText?: () => void;
  readonly onUndoAnnotations?: () => void;
  readonly onRevertWork?: () => void;
  readonly onExport?: () => void;
  readonly textData?: TextWithAnnotations;
  readonly userRole?: UserRole;
  readonly userAnnotationsCount?: number;
  readonly isSubmitting?: boolean;
  readonly isSkipping?: boolean;
  readonly isUndoing?: boolean;
  readonly isCompletedTask?: boolean;
}) {
  const navigate = useNavigate();

  // Determine if user can submit (annotator, reviewer, or admin)
  const canSubmit = userRole === "annotator" || userRole === "reviewer" || userRole === "admin";
  
  // Determine if user can only export (regular user)
  const canOnlyExport = userRole === "user";

  const handleSkip = () => {
    if (onSkipText) {
      onSkipText();
    }
  };

  const handleRevert = () => {
    if (onRevertWork) {
      onRevertWork();
    }
  };

  const handleUndo = () => {
    if (onUndoAnnotations) {
      onUndoAnnotations();
    }
  };

  const handleSubmit = () => {
    onSubmitTask();
    if (isCompletedTask) {
      navigate("/");
    }
  };
  return (
    <div className="flex gap-2 flex-wrap flex-col">
      {/* Submit button - only show for annotator, reviewer, or admin */}
      {canSubmit && (
        <Button
          onClick={handleSubmit}
          className="bg-green-600 h-20 hover:bg-green-700 text-white cursor-pointer"
          disabled={annotations.length === 0 || isSubmitting || isSkipping || isUndoing}
          size={"lg"}
          data-wireboard-event="click"
          data-wireboard-event-publisher="c62fdf36-9c41-4a5a-8464-d051cad20f5f"
          data-wireboard-event-click-category="annotation tool"
          data-wireboard-event-click-action="annotated"
        >
          <IoSend className="w-4 h-4 mr-2" />
          {(() => {
            if (isSubmitting) {
              return isCompletedTask ? "Updating..." : "Submitting...";
            }
            return isCompletedTask ? "Update" : "Submit";
          })()}
        </Button>
      )}

      {/* Export button - only show for regular users */}
      {canOnlyExport && onExport && textData && (
        <Button
          onClick={onExport}
          className="bg-blue-600 h-20 hover:bg-blue-700 text-white cursor-pointer"
          disabled={!textData}
          size={"lg"}
          title="Export text and annotations as JSON file"
        >
          <IoDownload className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
      )}

      {/* Skip button - only show for new tasks, not completed ones */}
      {!isCompletedTask && onSkipText && (
        <Button
          onClick={handleSkip}
          className="bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
          disabled={isSubmitting || isSkipping || isUndoing}
          size={"lg"}
          title="Skip this text - it won't be shown to you again"
        >
          <IoPlaySkipForward className="w-4 h-4 mr-2" />
          {isSkipping ? "Skipping..." : "Skip"}
        </Button>
      )}

      {/* Revert Work button - only show for completed tasks (edit mode) */}
      {isCompletedTask && onRevertWork && (
        <Button
          onClick={handleRevert}
          className="bg-yellow-600 hover:bg-yellow-700 text-white cursor-pointer"
          disabled={isSubmitting || isSkipping || isUndoing}
          size={"lg"}
          title="Revert your work and make text available for others"
        >
          <IoRefresh className="w-4 h-4 mr-2" />
          Revert Work
        </Button>
      )}

      {/* Undo button - remove all user annotations */}
      {onUndoAnnotations && userAnnotationsCount > 0 && (
        <Button
          onClick={handleUndo}
          className="bg-gray-600 hover:bg-gray-700 text-white cursor-pointer"
          disabled={isSubmitting || isSkipping || isUndoing}
          size={"lg"}
          title={`Remove all ${userAnnotationsCount} annotations you've added`}
        >
          <IoArrowUndo className="w-4 h-4 mr-2" />
          {isUndoing ? "Resetting..." : `Reset (${userAnnotationsCount})`}
        </Button>
      )}
    </div>
  );
}

export default ActionButtons;
