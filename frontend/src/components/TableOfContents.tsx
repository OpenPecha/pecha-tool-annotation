import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IoChevronBack,
  IoChevronDown,
  IoChevronForward,
  IoList,
  IoTrash,
} from "react-icons/io5";
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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
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

  // Type for hierarchical header structure
  interface HeaderNode {
    header: Annotation;
    children: HeaderNode[];
    level: number;
  }

  // Build hierarchical structure from flat headers
  const buildHeaderTree = (headers: Annotation[]): HeaderNode[] => {
    const sortedHeaders = [...headers].sort((a, b) => a.start - b.start);
    const nodes: HeaderNode[] = [];
    const nodeMap = new Map<string, HeaderNode>();

    // Create nodes for all headers
    sortedHeaders.forEach((header) => {
      const node: HeaderNode = {
        header,
        children: [],
        level: 0,
      };
      nodeMap.set(header.id, node);
    });

    // Build parent-child relationships
    sortedHeaders.forEach((header) => {
      const currentNode = nodeMap.get(header.id)!;
      let parent: HeaderNode | null = null;
      let smallestRange = Infinity;

      // Find the parent with the smallest range that contains this header
      for (const potentialParent of sortedHeaders) {
        if (
          potentialParent.id !== header.id &&
          potentialParent.start <= header.start &&
          potentialParent.end >= header.end
        ) {
          const range = potentialParent.end - potentialParent.start;
          if (range < smallestRange) {
            smallestRange = range;
            parent = nodeMap.get(potentialParent.id)!;
          }
        }
      }

      if (parent) {
        parent.children.push(currentNode);
        currentNode.level = parent.level + 1;
      } else {
        nodes.push(currentNode);
      }
    });

    return nodes;
  };

  const headers = annotations.filter((ann) => ann.type === "header");
  const headerTree = buildHeaderTree(headers);

  // Auto-expand root level nodes on initial load
  useEffect(() => {
    if (headerTree.length > 0) {
      const rootNodeIds = headerTree.map((node) => node.header.id);
      setExpandedNodes((prevExpanded) => {
        // Only set if the current expanded nodes are empty or don't contain any root nodes
        const hasRootNodes = rootNodeIds.some((id) => prevExpanded.has(id));
        if (!hasRootNodes && prevExpanded.size === 0) {
          return new Set(rootNodeIds);
        }
        return prevExpanded;
      });
    }
  }, [headerTree]);

  // Toggle node expansion
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Component to render individual header node
  const HeaderNodeComponent = ({
    node,
    index,
    onHeaderClick,
    onRemoveAnnotation,
    renderChildren,
  }: {
    node: HeaderNode;
    index: number;
    onHeaderClick: (annotation: Annotation) => void;
    onRemoveAnnotation: (id: string) => void;
    renderChildren: (nodes: HeaderNode[]) => React.ReactNode;
  }) => {
    const indentLevel = node.level;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.header.id);

    const indentColors = [
      "border-slate-200 bg-slate-50 hover:bg-slate-100",
      "border-purple-200 bg-purple-50 hover:bg-purple-100",
      "border-green-200 bg-green-50 hover:bg-green-100",
      "border-yellow-200 bg-yellow-50 hover:bg-yellow-100",
      "border-red-200 bg-red-50 hover:bg-red-100",
    ];
    const numberColors = [
      "bg-slate-100 text-slate-700",
      "bg-purple-100 text-purple-700",
      "bg-green-100 text-green-700",
      "bg-yellow-100 text-yellow-700",
      "bg-red-100 text-red-700",
    ];

    return (
      <div style={{ marginLeft: `${indentLevel * 12}px` }}>
        <div
          className={`w-full p-2 rounded border transition-all duration-200 group mb-1 ${
            indentColors[indentLevel % indentColors.length]
          }`}
        >
          <div className="flex items-center gap-2">
            {/* Expand/Collapse button for nodes with children */}
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNodeExpansion(node.header.id);
                }}
                className="h-4 w-4 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-sm flex-shrink-0"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <IoChevronDown className="h-3 w-3" />
                ) : (
                  <IoChevronForward className="h-3 w-3" />
                )}
              </Button>
            ) : (
              <div className="h-4 w-4 flex-shrink-0" />
            )}

            {/* Number badge */}
            <span
              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                numberColors[indentLevel % numberColors.length]
              }`}
            >
              {index + 1}
            </span>

            {/* Header content */}
            <div
              className="flex-1 min-w-0 cursor-pointer py-1"
              onClick={(e) => {
                e.stopPropagation();
                onHeaderClick(node.header);
              }}
            >
              <p className="text-xs font-medium font-monlam text-gray-900 truncate leading-tight">
                {node.header.name || node.header.text}
              </p>
              <p className="text-xs text-gray-500 leading-tight">
                L{indentLevel + 1} • {node.header.start}-{node.header.end}
              </p>
            </div>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveAnnotation(node.header.id);
              }}
              className="h-4 w-4 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-sm flex-shrink-0"
              title="Delete header"
            >
              <IoTrash className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>

        {/* Render children recursively only if expanded */}
        {hasChildren && isExpanded && (
          <div className="space-y-1 mt-1">{renderChildren(node.children)}</div>
        )}
      </div>
    );
  };

  // Recursive component to render header tree
  const renderHeaderNodes = (nodes: HeaderNode[]): React.ReactNode => {
    return nodes.map((node, index) => (
      <HeaderNodeComponent
        key={node.header.id}
        node={node}
        index={index}
        onHeaderClick={onHeaderClick}
        onRemoveAnnotation={onRemoveAnnotation}
        renderChildren={renderHeaderNodes}
      />
    ));
  };

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
                  <IoList className="w-5 h-5 text-purple-600" />
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
                  <IoChevronBack className="h-4 w-4 text-gray-600" />
                ) : (
                  <IoList className="h-5 w-5 text-purple-600" />
                )}
              </Button>
            </div>
          </CardHeader>

          {isOpen && (
            <CardContent className="pt-0">
              {/* Pending Header Input */}
              {pendingHeader && (
                <div className="mb-3 p-2 border-2 border-purple-300 rounded bg-purple-50">
                  <div className="mb-1">
                    <p className="text-xs text-purple-700 truncate">
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
                        className="flex-1 px-2 py-1 text-xs border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                        autoFocus
                      />
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-y-auto z-50"
                      >
                        {suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className={`px-2 py-1 cursor-pointer text-xs hover:bg-blue-50 ${
                              index === selectedSuggestionIndex
                                ? "bg-blue-100 text-purple-900"
                                : "text-gray-900"
                            }`}
                          >
                            {suggestion?.res || String(suggestion)}
                          </div>
                        ))}
                        {isLoadingSuggestions && (
                          <div className="px-2 py-1 text-xs text-gray-500">
                            Loading suggestions...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-purple-600 mt-1">
                    Press Enter to save, Esc to cancel.
                  </p>
                </div>
              )}

              <div className="space-y-1 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {headers.length === 0 ? (
                  <p className="text-xs text-gray-500 italic px-2 py-3">
                    No headers found. Add header annotations to see them here.
                  </p>
                ) : (
                  renderHeaderNodes(headerTree)
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};
