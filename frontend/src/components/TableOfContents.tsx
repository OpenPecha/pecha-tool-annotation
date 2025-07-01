import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, List, Trash2 } from "lucide-react";
import type { Annotation } from "@/pages/Index";

interface TableOfContentsProps {
  annotations: Annotation[];
  onHeaderClick: (annotation: Annotation) => void;
  onRemoveAnnotation: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const TableOfContents = ({
  annotations,
  onHeaderClick,
  onRemoveAnnotation,
  isOpen,
  onToggle,
}: TableOfContentsProps) => {
  const headers = annotations
    .filter((ann) => ann.type === "header")
    .sort((a, b) => a.start - b.start);

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
              {isOpen && (
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <List className="w-5 h-5 text-blue-600" />
                  Table of Contents
                </CardTitle>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className={`${
                  isOpen
                    ? "h-8 w-8 p-0 hover:bg-blue-50"
                    : "h-10 w-10 p-0 hover:bg-blue-50 rounded-full shadow-sm border border-gray-200"
                } transition-all duration-200`}
                title={
                  isOpen ? "Close Table of Contents" : "Open Table of Contents"
                }
              >
                {isOpen ? (
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                ) : (
                  <List className="h-5 w-5 text-blue-600" />
                )}
              </Button>
            </div>
          </CardHeader>

          {isOpen && (
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {headers.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No headers found. Add header annotations to see them here.
                  </p>
                ) : (
                  headers.map((header, index) => (
                    <div
                      key={header.id}
                      className="w-full p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold group-hover:bg-purple-200">
                          {index + 1}
                        </span>
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => onHeaderClick(header)}
                        >
                          <p className="text-sm font-medium text-gray-900 group-hover:text-purple-900 truncate">
                            {header.text}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Position {header.start}-{header.end}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveAnnotation(header.id);
                          }}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
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
