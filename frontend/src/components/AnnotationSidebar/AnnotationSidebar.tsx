import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IoTrash,
  IoChevronUp,
  IoChevronDown,
  IoLockClosed,
  IoChatbubbleEllipses,
  IoCheckmarkCircle,
  IoCloseCircle,
} from "react-icons/io5";
import type { Annotation } from "@/pages/Task";
import { ScrollArea } from "../ui/scroll-area";
import { truncateText } from "@/lib/utils";

interface AnnotationSidebarProps {
  annotations: Annotation[];
  onRemoveAnnotation: (id: string) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const AnnotationSidebar = ({
  annotations,
  onRemoveAnnotation,
  onAnnotationClick,
  isOpen,
  onToggle,
}: AnnotationSidebarProps) => {
  const getAnnotationColor = (type: string) => {
    switch (type) {
      case "entity":
        return "bg-blue-100 text-blue-800";
      case "person":
        return "bg-green-100 text-green-800";
      case "location":
        return "bg-purple-100 text-purple-800";
      case "organization":
        return "bg-orange-100 text-orange-800";
      case "date":
        return "bg-yellow-100 text-yellow-800";
      case "time":
        return "bg-pink-100 text-pink-800";
      case "number":
        return "bg-indigo-100 text-indigo-800";
      case "money":
        return "bg-emerald-100 text-emerald-800";
      case "percent":
        return "bg-teal-100 text-teal-800";
      case "header":
        return "bg-slate-100 text-slate-800";
      default:
        // Default for error annotations - use orange theme to match error classification
        return "bg-orange-100 text-orange-800";
    }
  };

  return (
    <div
      className={`flex flex-col mt-4 mb-4 transition-all duration-300 ${
        isOpen ? "h-[75vh]" : "h-auto"
      } w-full`}
    >
      <Card
        className={`flex flex-col transition-all duration-300 ${
          isOpen ? "h-full" : "h-auto"
        }`}
      >
        {isOpen ? (
          // Expanded state
          <>
            <CardHeader
              className="px-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200 flex-shrink-0"
              onClick={onToggle}
            >
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center justify-between">
                <span>Annotations ({annotations.length})</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {annotations.length}
                  </Badge>
                  <IoChevronUp className="h-4 w-4" />
                </div>
              </CardTitle>
            </CardHeader>
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <CardContent className="pt-0 space-y-3">
                  {annotations.length === 0 ? (
                    <p className="text-sm text-gray-500 italic text-center py-8">
                      No annotations yet. Select text to add annotations.
                    </p>
                  ) : (
                    annotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className={`p-3 rounded-lg border transition-all duration-200 bg-white group cursor-pointer ${
                          annotation.is_agreed
                            ? "border-green-200 bg-green-50/50 hover:bg-green-100/50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => onAnnotationClick?.(annotation)}
                        title="Click to navigate to this annotation in the editor"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={`text-xs font-medium ${getAnnotationColor(
                                annotation.type
                              )}`}
                              title={annotation.type}
                            >
                              {truncateText(annotation.type, 30)}
                            </Badge>
                            {annotation.level && (
                              <Badge
                                variant="outline"
                                className={`text-xs font-medium ${
                                  annotation.level === "critical"
                                    ? "border-red-300 text-red-700 bg-red-50"
                                    : annotation.level === "major"
                                    ? "border-yellow-300 text-yellow-700 bg-yellow-50"
                                    : "border-green-300 text-green-700 bg-green-50"
                                }`}
                              >
                                {annotation.level === "critical"
                                  ? "🔴"
                                  : annotation.level === "major"
                                  ? "🟡"
                                  : "🟢"}{" "}
                                {annotation.level}
                              </Badge>
                            )}
                            {annotation.is_agreed && (
                              <div className="flex items-center gap-1 text-green-600">
                                <IoLockClosed className="h-3 w-3" />
                                <span className="text-xs font-medium">
                                  Agreed
                                </span>
                              </div>
                            )}
                          </div>
                          {annotation.is_agreed ? (
                            <div className="h-6 w-6 flex items-center justify-center">
                              <IoLockClosed className="h-3 w-3 text-green-600" />
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveAnnotation(annotation.id);
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            >
                              <IoTrash className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm font-monlam leading-[normal] text-gray-900 font-medium mb-1 break-words">
                          "{truncateText(annotation.text, 30)}"
                        </p>

                        {/* Review Comments Section */}
                        {annotation.reviews &&
                          annotation.reviews.length > 0 && (
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <IoChatbubbleEllipses className="h-3 w-3" />
                                <span>Reviewer Comments:</span>
                              </div>
                              {annotation.reviews.map((review) => (
                                <div
                                  key={review.id}
                                  className={`p-2 rounded border text-xs ${
                                    review.decision === "agree"
                                      ? "bg-green-50 border-green-200"
                                      : "bg-red-50 border-red-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-1 mb-1">
                                    {review.decision === "agree" ? (
                                      <IoCheckmarkCircle className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <IoCloseCircle className="h-3 w-3 text-red-600" />
                                    )}
                                    <span
                                      className={`font-medium ${
                                        review.decision === "agree"
                                          ? "text-green-700"
                                          : "text-red-700"
                                      }`}
                                    >
                                      {review.decision === "agree"
                                        ? "Agreed"
                                        : "Disagreed"}
                                    </span>
                                    <span className="text-gray-500 ml-auto">
                                      {new Date(
                                        review.created_at
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {review.comment && (
                                    <p className="text-gray-700 italic">
                                      "{review.comment}"
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                        <p className="text-xs text-gray-500 mt-2">
                          Position {annotation.start}-{annotation.end}
                          {annotation.is_agreed && (
                            <span className="ml-2 text-green-600">
                              • Locked by reviewer
                            </span>
                          )}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </ScrollArea>
            </div>
          </>
        ) : (
          // Collapsed state
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Annotations ({annotations.length})
            </span>
            <button
              onClick={onToggle}
              className="h-6 w-6 p-0 hover:bg-blue-50 rounded transition-all duration-200 flex items-center justify-center"
              title="Expand Annotations"
            >
              <IoChevronDown className="h-4 w-4 text-blue-600" />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};
