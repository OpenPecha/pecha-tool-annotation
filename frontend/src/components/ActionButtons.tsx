import { Button } from "./ui/button";
import type { Annotation } from "@/utils/annotationConverter";
import {
  IoSend,
  IoPlaySkipForward,
  IoArrowUndo,
  IoRefresh,
} from "react-icons/io5";
import { useNavigate } from "react-router-dom";

function ActionButtons({
  annotations,
  onSubmitTask,
  onSkipText,
  onUndoAnnotations,
  onRevertWork,
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
  readonly userAnnotationsCount?: number;
  readonly isSubmitting?: boolean;
  readonly isSkipping?: boolean;
  readonly isUndoing?: boolean;
  readonly isCompletedTask?: boolean;
}) {
  const navigate = useNavigate();

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
        {isSubmitting
          ? isCompletedTask
            ? "Updating..."
            : "Submitting..."
          : isCompletedTask
          ? "Update"
          : "Submit"}
      </Button>

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
