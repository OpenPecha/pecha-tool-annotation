import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Search, ChevronUp, ChevronDown } from "lucide-react";

interface SearchResult {
  index: number;
  start: number;
  end: number;
  line: number;
  preview: string;
}

interface SearchComponentProps {
  text: string;
  isVisible: boolean;
  onClose: () => void;
  onResultSelect: (start: number, end: number) => void;
}

export const SearchComponent: React.FC<SearchComponentProps> = ({
  text,
  isVisible,
  onClose,
  onResultSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when component becomes visible
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isVisible]);

  // Perform search when search term or options change
  useEffect(() => {
    if (searchTerm.trim()) {
      performSearch(searchTerm);
    } else {
      setSearchResults([]);
      setCurrentResultIndex(0);
    }
  }, [searchTerm, caseSensitive, wholeWord, text]);

  const performSearch = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const lines = text.split("\n");
    let globalIndex = 0;

    // Create regex pattern based on options
    let pattern = term;
    if (wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }

    const flags = caseSensitive ? "g" : "gi";
    const regex = new RegExp(pattern, flags);

    lines.forEach((line, lineIndex) => {
      let match;
      const lineStartIndex = globalIndex;

      while ((match = regex.exec(line)) !== null) {
        const start = lineStartIndex + match.index;
        const end = start + match[0].length;

        // Create preview with context
        const previewStart = Math.max(0, match.index - 20);
        const previewEnd = Math.min(
          line.length,
          match.index + match[0].length + 20
        );
        const preview = `${previewStart > 0 ? "..." : ""}${line.substring(
          previewStart,
          previewEnd
        )}${previewEnd < line.length ? "..." : ""}`;

        results.push({
          index: results.length,
          start,
          end,
          line: lineIndex + 1,
          preview,
        });

        // Prevent infinite loop for zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }

      globalIndex += line.length + 1; // +1 for the newline character
    });

    setSearchResults(results);
    setCurrentResultIndex(0);
  };

  const handleResultClick = (result: SearchResult) => {
    onResultSelect(result.start, result.end);
    setCurrentResultIndex(result.index);
  };

  const navigateToResult = (direction: "next" | "prev") => {
    if (searchResults.length === 0) return;

    let newIndex;
    if (direction === "next") {
      newIndex = (currentResultIndex + 1) % searchResults.length;
    } else {
      newIndex =
        currentResultIndex === 0
          ? searchResults.length - 1
          : currentResultIndex - 1;
    }

    setCurrentResultIndex(newIndex);
    const result = searchResults[newIndex];
    onResultSelect(result.start, result.end);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        navigateToResult("prev");
      } else {
        navigateToResult("next");
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="absolute top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Search</span>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search Input */}
      <div className="mb-3">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search in text..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Search Options */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            className="w-3 h-3"
          />
          <span className="text-gray-600">Case sensitive</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={wholeWord}
            onChange={(e) => setWholeWord(e.target.checked)}
            className="w-3 h-3"
          />
          <span className="text-gray-600">Whole word</span>
        </label>
      </div>

      {/* Results Summary */}
      {searchTerm && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">
            {searchResults.length === 0
              ? "No results found"
              : `${currentResultIndex + 1} of ${searchResults.length} results`}
          </span>
          {searchResults.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                onClick={() => navigateToResult("prev")}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={searchResults.length === 0}
              >
                <ChevronUp className="w-3 h-3" />
              </Button>
              <Button
                onClick={() => navigateToResult("next")}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={searchResults.length === 0}
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Results List */}
      {searchResults.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
          {searchResults.map((result) => (
            <div
              key={result.index}
              onClick={() => handleResultClick(result)}
              className={`p-2 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                result.index === currentResultIndex
                  ? "bg-blue-50 border-blue-200"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">
                    Line {result.line}
                  </div>
                  <div className="text-sm text-gray-700 truncate">
                    {result.preview}
                  </div>
                </div>
                <div className="text-xs text-gray-400 ml-2">
                  {result.index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-3 text-xs text-gray-400">
        Press Enter to navigate, Shift+Enter for previous, Esc to close
      </div>
    </div>
  );
};
