import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IoTrash,
  IoChevronDown,
  IoChevronUp,
  IoLockClosed,
} from "react-icons/io5";
import type { Annotation } from "@/pages/Task";

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
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <Card className="h-full">
          <CardHeader
            className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            onClick={onToggle}
          >
            <CardTitle className="text-sm font-medium text-gray-900 flex items-center justify-between">
              <span>Annotations ({annotations.length})</span>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {annotations.length}
                </Badge>
                {isOpen ? (
                  <IoChevronUp className="h-4 w-4" />
                ) : (
                  <IoChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardTitle>
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
                      className={`p-3 rounded-lg border transition-all duration-200 bg-white group ${
                        annotation.is_agreed
                          ? "border-green-200 bg-green-50/50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={`text-xs font-medium ${getAnnotationColor(
                              annotation.type
                            )}`}
                          >
                            {annotation.type}
                          </Badge>
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
                            onClick={() => onRemoveAnnotation(annotation.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            <IoTrash className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm font-monlam leading-[normal] text-gray-900 font-medium mb-1 break-words">
                        "{annotation.text}"
                      </p>
                      <p className="text-xs text-gray-500">
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
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};
