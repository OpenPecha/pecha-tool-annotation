import { Button } from "./ui/button";
import type { Annotation } from "@/pages/Task";
import { Send, SkipForward, StopCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

function ActionButtons({
  annotations,
  onSubmitTask,
  isSubmitting = false,
  isCompletedTask = false,
}: {
  readonly annotations: Annotation[];
  readonly onSubmitTask: () => void;
  readonly isSubmitting?: boolean;
  readonly isCompletedTask?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 gap-2">
      <Button
        onClick={onSubmitTask}
        className="bg-green-600 flex-1 hover:bg-green-700 text-white cursor-pointer"
        disabled={annotations.length === 0 || isSubmitting}
        size={"lg"}
      >
        <Send className="w-4 h-4 mr-2" />
        {isSubmitting
          ? isCompletedTask
            ? "Updating..."
            : "Submitting..."
          : isCompletedTask
          ? "Update Task"
          : "Submit Task"}
      </Button>

      <Button
        onClick={() => {
          navigate("/");
        }}
        className="bg-red-600 hover:bg-red-800 text-white cursor-pointer"
        size={"lg"}
      >
        <StopCircle className="w-4 h-4 mr-2" />
        Cancel
      </Button>
    </div>
  );
}

export default ActionButtons;
