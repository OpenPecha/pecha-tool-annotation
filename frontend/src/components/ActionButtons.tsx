import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Annotation } from "@/pages/Index";
import { Send, StopCircle } from "lucide-react";

function ActionButtons({
  text,
  annotations,
}: {
  readonly text: string;
  readonly annotations: Annotation[];
}) {
  const { toast } = useToast();

  const handleSubmit = () => {
    const result = {
      text,
      annotations: annotations.map((ann) => ({
        annotation: ann.text,
        type: ann.type,
        start: ann.start,
        end: ann.end,
      })),
    };

    console.log("Submitted Annotations:", result);

    toast({
      title: "Work Submitted",
      description: "Check the console for annotation data",
    });
  };
  return (
    <div className="flex flex-1 gap-2">
      <Button
        onClick={handleSubmit}
        className="bg-green-600 flex-1 hover:bg-green-700 text-white cursor-pointer"
        disabled={annotations.length === 0}
        size={"lg"}
      >
        <Send className="w-4 h-4 mr-2" />
        Submit Work
      </Button>
      <Button
        onClick={handleSubmit}
        className="bg-red-600 hover:bg-red-800 text-white cursor-pointer"
        size={"lg"}
      >
        <StopCircle className="w-4 h-4 mr-2" />
        Skip
      </Button>
    </div>
  );
}

export default ActionButtons;
