import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, List, Trash2, Check, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBDRCAutosuggest } from "@/api/bdrc";
import type { Annotation } from "@/pages/Task";

// Type for BDRC suggestion
interface BDRCSuggestion {
  res?: string;
  title?: string;
  name?: string;
  [key: string]: string | number | boolean | null | undefined;
}

interface TableOfContentsProps {
  annotations: Annotation[];
  onHeaderClick: (annotation: Annotation) => void;
  onRemoveAnnotation: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  pendingHeader?: { text: string; start: number; end: number } | null;
  onHeaderNameSubmit?: (name: string) => void;
  onHeaderNameCancel?: () => void;
}

export const TableOfContents = ({
  annotations,
  onHeaderClick,
  onRemoveAnnotation,
  isOpen,
  onToggle,
  pendingHeader,
  onHeaderNameSubmit,
  onHeaderNameCancel,
}: TableOfContentsProps) => {
  const [headerName, setHeaderName] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounce the query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(headerName);
    }, 300);

    return () => clearTimeout(timer);
  }, [headerName]);

  // Fetch autosuggest data
  const { data: suggestions = [], isLoading: isLoadingSuggestions } = useQuery<
    BDRCSuggestion[]
  >({
    queryKey: ["bdrc-autosuggest", debouncedQuery],
    queryFn: () => getBDRCAutosuggest(debouncedQuery),
    enabled: debouncedQuery.length > 2, // Only search if query is longer than 2 characters
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const headers = annotations
    .filter((ann) => ann.type === "header")
    .sort((a, b) => a.start - b.start);

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter" && headerName.trim() && onHeaderNameSubmit) {
        onHeaderNameSubmit(headerName.trim());
        setHeaderName("");
        setShowSuggestions(false);
      } else if (e.key === "Escape" && onHeaderNameCancel) {
        onHeaderNameCancel();
        setHeaderName("");
        setShowSuggestions(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const selectedSuggestion = suggestions[selectedSuggestionIndex];
          const suggestionText =
            selectedSuggestion.res ||
            selectedSuggestion.title ||
            selectedSuggestion.name ||
            String(selectedSuggestion);
          setHeaderName(suggestionText);
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
        } else if (headerName.trim() && onHeaderNameSubmit) {
          onHeaderNameSubmit(headerName.trim());
          setHeaderName("");
          setShowSuggestions(false);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        if (onHeaderNameCancel) {
          onHeaderNameCancel();
          setHeaderName("");
        }
        break;
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: BDRCSuggestion) => {
    const suggestionText =
      suggestion.res ||
      suggestion.title ||
      suggestion.name ||
      String(suggestion);
    setHeaderName(suggestionText);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    if (onHeaderNameSubmit) {
      onHeaderNameSubmit(suggestionText);
      setHeaderName("");
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHeaderName(value);
    setShowSuggestions(value.length > 0);
    setSelectedSuggestionIndex(-1);
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (headerName.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle input blur (with delay to allow clicking suggestions)
  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, 200);
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
              {/* Pending Header Input */}
              {pendingHeader && (
                <div className="mb-4 p-3 border-2 border-blue-300 rounded-lg bg-blue-50">
                  <div className="mb-2">
                    <p className="text-xs text-blue-700 truncate">
                      "{pendingHeader.text}"
                    </p>
                  </div>
                  <div className="relative">
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={headerName}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder="Enter header name..."
                        className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto z-50"
                      >
                        {suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className={`px-3 py-2 cursor-pointer text-sm hover:bg-blue-50 ${
                              index === selectedSuggestionIndex
                                ? "bg-blue-100 text-blue-900"
                                : "text-gray-900"
                            }`}
                          >
                            {suggestion?.res || String(suggestion)}
                          </div>
                        ))}
                        {isLoadingSuggestions && (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            Loading suggestions...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Press Enter to save, Esc to cancel.
                  </p>
                </div>
              )}

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
                            {header.name || header.text}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Position {header.start}-{header.end}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveAnnotation(header.id);
                            }}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            title="Delete header"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
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
