import { Button } from "./ui/button";
import type { Annotation } from "@/pages/Task";
import { Send, SkipForward, StopCircle } from "lucide-react";

function ActionButtons({
  annotations,
  onSubmitTask,
  isSubmitting = false,
}: {
  readonly annotations: Annotation[];
  readonly onSubmitTask: () => void;
  readonly isSubmitting?: boolean;
}) {
  return (
    <div className="flex flex-1 gap-2">
      <Button
        onClick={onSubmitTask}
        className="bg-green-600 flex-1 hover:bg-green-700 text-white cursor-pointer"
        disabled={annotations.length === 0 || isSubmitting}
        size={"lg"}
      >
        <Send className="w-4 h-4 mr-2" />
        {isSubmitting ? "Submitting..." : "Submit Task"}
      </Button>
      <Button
        onClick={() => {
          /* TODO: Implement skip functionality */
        }}
        className="bg-yellow-600 flex-1 hover:bg-yellow-700 text-white cursor-pointer"
        disabled={annotations.length === 0}
        size={"lg"}
      >
        <SkipForward className="w-4 h-4 mr-2" />
        Skip Work
      </Button>
      <Button
        onClick={() => {
          /* TODO: Implement trash/cancel functionality */
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
