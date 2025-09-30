import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IoChevronDown,
  IoChevronForward,
  IoSearch,
  IoWarning,
} from "react-icons/io5";
import { useState, useEffect, useMemo } from "react";

// Type definitions for error typology
interface ErrorCategory {
  id: string;
  name: string;
  mnemonic: string;
  description: string;
  examples?: string[];
  notes?: string;
  level: number;
  parent?: string;
  subcategories?: ErrorCategory[];
}

interface ErrorTypology {
  error_typology: {
    version: string;
    title: string;
    description: string;
    copyright: string;
    categories: ErrorCategory[];
  };
}

interface ErrorListProps {
  onErrorSelect?: (error: ErrorCategory) => void;
  searchable?: boolean;
}

export const ErrorList = ({
  onErrorSelect,
  searchable = true,
}: ErrorListProps) => {
  const [errorData, setErrorData] = useState<ErrorTypology | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load error list data
  useEffect(() => {
    const loadErrorData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/error_list.json");
        if (!response.ok) {
          throw new Error("Failed to load error list");
        }
        const data: ErrorTypology = await response.json();
        setErrorData(data);
        setError(null);
      } catch (err) {
        console.error("Error loading error list:", err);
        setError("Failed to load error list");
      } finally {
        setLoading(false);
      }
    };

    loadErrorData();
  }, []);


  // Flatten the hierarchical structure for easier searching
  const flattenCategories = (categories: ErrorCategory[]): ErrorCategory[] => {
    const result: ErrorCategory[] = [];

    const flatten = (cats: ErrorCategory[], parentId?: string) => {
      cats.forEach((cat) => {
        const categoryWithParent = { ...cat, parent: parentId };
        result.push(categoryWithParent);
        if (cat.subcategories) {
          flatten(cat.subcategories, cat.id);
        }
      });
    };

    flatten(categories);
    return result;
  };

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!errorData || !searchQuery.trim()) {
      return errorData?.error_typology.categories || [];
    }

    const query = searchQuery.toLowerCase();
    const allCategories = flattenCategories(
      errorData.error_typology.categories
    );

    // Find matching categories
    const matchingCategories = allCategories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.description.toLowerCase().includes(query) ||
        cat.mnemonic.toLowerCase().includes(query) ||
        (cat.examples &&
          cat.examples.some((ex) => ex.toLowerCase().includes(query)))
    );

    // Build a filtered tree that includes matching categories and their ancestors/descendants
    const relevantIds = new Set<string>();

    matchingCategories.forEach((cat) => {
      relevantIds.add(cat.id);

      // Add ancestors
      let current = allCategories.find((c) => c.id === cat.parent);
      while (current) {
        relevantIds.add(current.id);
        current = allCategories.find((c) => c.id === current?.parent);
      }

      // Add descendants
      const addDescendants = (categoryId: string) => {
        allCategories
          .filter((c) => c.parent === categoryId)
          .forEach((child) => {
            relevantIds.add(child.id);
            addDescendants(child.id);
          });
      };
      addDescendants(cat.id);
    });

    // Rebuild the tree structure with only relevant categories
    const buildFilteredTree = (
      categories: ErrorCategory[]
    ): ErrorCategory[] => {
      return categories
        .filter((cat) => relevantIds.has(cat.id))
        .map((cat) => ({
          ...cat,
          subcategories: cat.subcategories
            ? buildFilteredTree(cat.subcategories)
            : undefined,
        }));
    };

    return buildFilteredTree(errorData.error_typology.categories);
  }, [errorData, searchQuery]);

  // Auto-expand root level nodes and matching nodes when searching
  useEffect(() => {
    if (filteredCategories.length > 0) {
      setExpandedNodes((prevExpanded) => {
        const newExpanded = new Set(prevExpanded);

        if (searchQuery.trim()) {
          // Expand all nodes when searching to show results
          const expandAll = (categories: ErrorCategory[]) => {
            categories.forEach((cat) => {
              newExpanded.add(cat.id);
              if (cat.subcategories) {
                expandAll(cat.subcategories);
              }
            });
          };
          expandAll(filteredCategories);
        } else {
          // Only expand root level by default
          const rootNodeIds = filteredCategories.map((cat) => cat.id);
          rootNodeIds.forEach((id) => newExpanded.add(id));
        }

        return newExpanded;
      });
    }
  }, [filteredCategories, searchQuery]);

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


  // Component to render individual error category
  const ErrorCategoryComponent = ({
    category,
    level = 0,
    searchQuery = "",
  }: {
    category: ErrorCategory;
    level?: number;
    searchQuery?: string;
  }) => {
    const hasChildren =
      category.subcategories && category.subcategories.length > 0;
    const isExpanded = expandedNodes.has(category.id);

    const indentColors = [
      "border-red-200 bg-red-50 hover:bg-red-100",
      "border-orange-200 bg-orange-50 hover:bg-orange-100",
      "border-amber-200 bg-amber-50 hover:bg-amber-100",
      "border-yellow-200 bg-yellow-50 hover:bg-yellow-100",
      "border-lime-200 bg-lime-50 hover:bg-lime-100",
    ];

    const levelColors = [
      "bg-red-100 text-red-700",
      "bg-orange-100 text-orange-700",
      "bg-amber-100 text-amber-700",
      "bg-yellow-100 text-yellow-700",
      "bg-lime-100 text-lime-700",
    ];

    // Highlight search matches
    const highlightText = (text: string, query: string) => {
      if (!query.trim()) return text;
      const regex = new RegExp(
        `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi"
      );
      const parts = text.split(regex);
      return parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      );
    };

    return (
      <div style={{ marginLeft: `${level * 12}px` }}>
        <div
          className={`w-full p-2 rounded border transition-all duration-200 group mb-1 ${
            indentColors[level % indentColors.length]
          }`}
        >
          <div className="flex items-start gap-2">
            {/* Expand/Collapse button */}
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNodeExpansion(category.id);
                }}
                className="h-4 w-4 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-sm flex-shrink-0 mt-0.5"
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

            {/* Level indicator */}
            <span
              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                levelColors[level % levelColors.length]
              }`}
            >
              L{level}
            </span>

            {/* Category content */}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => onErrorSelect?.(category)}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 leading-tight truncate">
                    {highlightText(category.name, searchQuery)}
                  </h4>
                  <p className="text-xs text-gray-600 font-mono">
                    {category.mnemonic} • {category.id}
                  </p>
                </div>

                {/* Exclamation mark with tooltip */}
                <div className="flex-shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-orange-600 transition-colors border-2 border-white shadow-sm">
                        !
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      className="w-80 p-4 bg-gray-900 text-white text-xs border-gray-700"
                      sideOffset={8}
                    >
                      <div className="space-y-2">
                        <div>
                          <p className="font-semibold text-gray-200">
                            {category.name}
                          </p>
                          <p className="text-gray-300 font-mono">
                            {category.mnemonic} • {category.id}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-100 leading-relaxed">
                            {category.description}
                          </p>
                        </div>

                        {category.examples && category.examples.length > 0 && (
                          <div>
                            <p className="font-medium text-gray-200 mb-1">Examples:</p>
                            <ul className="text-gray-300 space-y-1">
                              {category.examples
                                .slice(0, 2)
                                .map((example, idx) => (
                                  <li key={idx} className="italic">
                                    "{example}"
                                  </li>
                                ))}
                              {category.examples.length > 2 && (
                                <li className="text-gray-400">
                                  +{category.examples.length - 2} more examples
                                </li>
                              )}
                            </ul>
                          </div>
                        )}

                        {category.notes && (
                          <div>
                            <p className="text-blue-300 italic">
                              {category.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Render children recursively */}
        {hasChildren && isExpanded && category.subcategories && (
          <div className="space-y-1 mt-1">
            {category.subcategories.map((subcat) => (
              <ErrorCategoryComponent
                key={subcat.id}
                category={subcat}
                level={level + 1}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading error list...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center text-red-600">
          <IoWarning className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!errorData) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-gray-600">No error data available</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-visible pt-6">
      {/* Search box */}
      {searchable && (
        <div className="mb-3 flex-shrink-0">
          <div className="relative">
            <IoSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search error types..."
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-transparent"
            />
          </div>
          {searchQuery && (
            <p className="text-xs text-gray-500 mt-1">
              {filteredCategories.length} categories found
            </p>
          )}
        </div>
      )}

      {/* Error categories */}
      <div className="flex-1 min-h-0 overflow-y-auto  scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 space-y-1">
        {filteredCategories.length === 0 ? (
          <p className="text-xs text-gray-500 italic px-2 py-3">
            {searchQuery
              ? "No errors found matching your search."
              : "No error categories available."}
          </p>
        ) : (
          filteredCategories.map((category) => (
            <ErrorCategoryComponent
              key={category.id}
              category={category}
              level={0}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>

    </div>
  );
};
