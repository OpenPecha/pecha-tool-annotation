import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { IoClose, IoSearch } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import type { BubbleMenuProps } from "../types";
import { useUmamiTracking, getUserContext } from "@/hooks/use-umami-tracking";
import { useAuth } from "@/auth/use-auth-hook";

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

interface CategoryWithBreadcrumb extends ErrorCategory {
  breadcrumb: string;
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

export const BubbleMenu: React.FC<BubbleMenuProps> = ({
  visible,
  position,
  currentSelection,
  annotationLevel,
  isCreatingAnnotation,
  onAddAnnotation,
  onCancel,
  onAnnotationLevelChange,
}) => {
  const [errorData, setErrorData] = useState<ErrorTypology | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedErrorCategory, setSelectedErrorCategory] =
    useState<CategoryWithBreadcrumb | null>(null);
  const { currentUser } = useAuth();
  const { trackAnnotationCreated } = useUmamiTracking();

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

  // Get only innermost subcategories (leaf nodes) for searching
  const getInnermostCategories = (
    categories: ErrorCategory[]
  ): ErrorCategory[] => {
    const allCategories = flattenCategories(categories);
    // Return only categories that don't have subcategories (leaf nodes)
    return allCategories.filter(
      (cat) => !cat.subcategories || cat.subcategories.length === 0
    );
  };

  // Build breadcrumb path for a category
  const buildBreadcrumb = (category: ErrorCategory): string => {
    const allCategories = flattenCategories(
      errorData?.error_typology.categories || []
    );
    const path: string[] = [];

    let current = category;
    while (current.parent) {
      const parent = allCategories.find((cat) => cat.id === current.parent);
      if (parent) {
        path.unshift(parent.name);
        current = parent;
      } else {
        break;
      }
    }

    return path.join(" → ");
  };

  // Filter innermost categories and add breadcrumb info
  const filteredCategories = useMemo(() => {
    if (!errorData) return [];

    const innermostCategories = getInnermostCategories(
      errorData.error_typology.categories
    );

    if (!searchQuery.trim()) {
      // Show all innermost categories when no search query
      return innermostCategories.map((category) => ({
        ...category,
        breadcrumb: buildBreadcrumb(category),
      }));
    }

    const query = searchQuery.toLowerCase();

    // Find matching innermost categories
    const matchingCategories = innermostCategories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.description.toLowerCase().includes(query) ||
        cat.mnemonic.toLowerCase().includes(query) ||
        (cat.examples &&
          cat.examples.some((ex) => ex.toLowerCase().includes(query)))
    );

    // Add breadcrumb to matching categories
    return matchingCategories.map((category) => ({
      ...category,
      breadcrumb: buildBreadcrumb(category),
    }));
  }, [errorData, searchQuery]);

  if (!visible || !currentSelection) return null;

  const handleAddAnnotation = () => {
    if (currentSelection && selectedErrorCategory && annotationLevel) {
      // Track annotation creation
      trackAnnotationCreated(
        selectedErrorCategory.id,
        window.location.pathname.split("/").pop() || "unknown",
        currentSelection.text.length,
        {
          ...getUserContext(currentUser),
          annotation_id: `temp-${Date.now()}`,
        }
      );
      // Pass the human-readable label instead of the ID
      onAddAnnotation(selectedErrorCategory.name, undefined, annotationLevel);
    }
  };

  const handleCancel = () => {
    // Track bubble menu close

    onCancel();
  };

  const modalContent = (
    <div
      className="fixed bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 min-w-[380px]"
      style={{
        left: `max(${position.x}px, 50vw - 100px)`,
        top: `${position.y}px`,
        transform: `translateX(${position.transformX})`,
        maxWidth: "40vw", // Prevent modal from being too wide on small screens
      }}
    >
      {/* Close button */}
      <Button
        onClick={handleCancel}
        disabled={isCreatingAnnotation}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <IoClose className="w-4 h-4" />
      </Button>

      <div className="mb-3 pr-8">
        {/* <p className="text-sm font-medium text-gray-700 mb-2">
          Selected: "
          {currentSelection.text.length > 50
            ? currentSelection.text.substring(0, 50) + "..."
            : currentSelection.text}
          "
        </p> */}
        {isCreatingAnnotation ? (
          <div className="text-xs text-blue-600 mb-3 flex items-center gap-2">
            <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin" />
            <span className="font-medium">Creating annotation...</span>
          </div>
        ) : (
          <p className="text-xs text-gray-500 mb-3">Choose error type:</p>
        )}

        {/* Search box */}
        {!isCreatingAnnotation && (
          <div className="mb-3">
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
                {filteredCategories.length} errors found
              </p>
            )}
          </div>
        )}

        {/* Error loading/error states */}
        {loading && (
          <div className="text-center py-4">
            <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-xs text-gray-500">Loading error types...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Error Categories */}
        {!loading && !error && errorData && (
          <div
            className={`max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 mb-3 transition-all duration-300 ${
              isCreatingAnnotation ? "opacity-75 scale-95" : ""
            }`}
          >
            <div className="space-y-1">
              {filteredCategories
                .slice(0, 20) // Limit to first 20 results
                .map((category) => (
                  <Button
                    key={category.id}
                    onClick={() => setSelectedErrorCategory(category)}
                    disabled={isCreatingAnnotation}
                    variant={
                      selectedErrorCategory?.id === category.id
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className={`w-full justify-start h-16 px-3 py-2 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedErrorCategory?.id === category.id
                        ? "bg-orange-100 border-orange-400 text-orange-900"
                        : isCreatingAnnotation
                        ? "animate-pulse"
                        : "hover:bg-orange-50 hover:border-orange-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {category.name}
                        </div>
                        {category.breadcrumb && (
                          <div className="text-xs text-gray-600 truncate">
                            {category.breadcrumb}
                          </div>
                        )}
                        <div className="text-xs font-mono opacity-70">
                          {category.mnemonic} • L{category.level}
                        </div>
                      </div>
                      {selectedErrorCategory?.id === category.id && (
                        <span className="text-orange-600 text-xs">✓</span>
                      )}
                    </div>
                  </Button>
                ))}
              {filteredCategories.length === 0 && (
                <p className="text-xs text-gray-500 italic px-2 py-3">
                  {searchQuery
                    ? "No errors found matching your search."
                    : "No error categories available."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Update existing header section - HIDDEN FOR NOW */}
      </div>

      {/* Level Selection */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-2">
          Importance level (required):
        </p>
        <select
          value={annotationLevel}
          onChange={(e) => onAnnotationLevelChange(e.target.value)}
          disabled={isCreatingAnnotation}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <option value="">Select level...</option>
          <option value="minor">🟢 Minor</option>
          <option value="major">🟡 Major</option>
          <option value="critical">🔴 Critical</option>
        </select>
      </div>

      {/* Add Annotation Button */}
      {selectedErrorCategory && annotationLevel && (
        <div className="mb-3">
          <Button
            onClick={handleAddAnnotation}
            disabled={isCreatingAnnotation}
            className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingAnnotation ? (
              <div className="flex items-center justify-center gap-2">
                <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
                Creating annotation...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>Add Annotation</span>
                <span className="text-xs opacity-75">
                  ({selectedErrorCategory.mnemonic} • {annotationLevel})
                </span>
              </div>
            )}
          </Button>
        </div>
      )}

      {/* Note section - HIDDEN */}
    </div>
  );

  return createPortal(modalContent, document.body);
};
