import { Button } from "./ui/button";
import type { Annotation } from "@/pages/Task";
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
  readonly isCompletedTask?: boolean;
}) {
  const navigate = useNavigate();
  const handleSubmit = () => {
    onSubmitTask();
    if (isCompletedTask) {
      navigate("/");
    }
  };
  return (
    <div className="flex flex-1 gap-2 flex-wrap flex-col">
      <Button
        onClick={handleSubmit}
        className="bg-green-600 h-20 hover:bg-green-700 text-white cursor-pointer"
        disabled={annotations.length === 0 || isSubmitting || isSkipping}
        size={"lg"}
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
          onClick={onSkipText}
          className="bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
          disabled={isSubmitting || isSkipping}
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
          onClick={onRevertWork}
          className="bg-yellow-600 hover:bg-yellow-700 text-white cursor-pointer"
          disabled={isSubmitting || isSkipping}
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
          onClick={onUndoAnnotations}
          className="bg-gray-600 hover:bg-gray-700 text-white cursor-pointer"
          disabled={isSubmitting || isSkipping}
          size={"lg"}
          title={`Remove all ${userAnnotationsCount} annotations you've added`}
        >
          <IoArrowUndo className="w-4 h-4 mr-2" />
          Reset ({userAnnotationsCount})
        </Button>
      )}
    </div>
  );
}

export default ActionButtons;
