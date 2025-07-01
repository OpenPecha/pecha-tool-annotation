import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, ChevronRight, MessageSquare } from "lucide-react";
import type { Annotation } from "@/pages/Index";

interface AnnotationSidebarProps {
  annotations: Annotation[];
  onRemoveAnnotation: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const AnnotationSidebar = ({
  annotations,
  onRemoveAnnotation,
  isOpen,
  onToggle,
}: AnnotationSidebarProps) => {
  const getAnnotationColor = (type: string) => {
    switch (type) {
      case "header":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "person":
        return "bg-green-100 text-green-800 border-green-200";
      case "object":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="sticky top-5 z-40">
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? "w-80" : "w-14"
        }`}
      >
        <Card
          className={`shadow-lg border-0 backdrop-blur-sm h-fit ${
            !isOpen ? "p-0" : "p-3"
          }`}
        >
          <CardHeader className={`${isOpen ? "pb-3" : "p-3"}`}>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className={`${
                  isOpen
                    ? "h-8 w-8 p-0 hover:bg-blue-50"
                    : "h-10 w-10 p-0 hover:bg-blue-50 rounded-full shadow-sm border border-gray-200"
                } transition-all duration-200`}
                title={isOpen ? "Close Annotations" : "Open Annotations"}
              >
                {isOpen ? (
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                )}
              </Button>
              {isOpen && (
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Annotations ({annotations.length})
                </CardTitle>
              )}
            </div>
          </CardHeader>

          {isOpen && (
            <CardContent className="pt-0">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {annotations.length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-8">
                    No annotations yet. Select text to add annotations.
                  </p>
                ) : (
                  annotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 bg-white"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge
                          variant="secondary"
                          className={`text-xs font-medium ${getAnnotationColor(
                            annotation.type
                          )}`}
                        >
                          {annotation.type}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveAnnotation(annotation.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-900 font-medium mb-1 break-words">
                        "{annotation.text}"
                      </p>
                      <p className="text-xs text-gray-500">
                        Position {annotation.start}-{annotation.end}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};
