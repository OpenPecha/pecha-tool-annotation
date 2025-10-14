import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { IoClose, IoSearch } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import type { BubbleMenuProps } from "../types";
import { useAuth } from "@/auth/use-auth-hook";
import {
  STRUCTURAL_ANNOTATION_TYPES,
  isStructuralAnnotationType,
  type StructuralAnnotationType,
} from "@/config/structural-annotations";
import { useAnnotationStore } from "@/store/annotation";
import type { CategoryOutput } from "@/api/annotation_list";
import { useAnnotationListHierarchical } from "@/hooks/useAnnotationListHierarchical";
import { useAnnotationFiltersStore } from "@/store/annotationFilters";

// Type definitions for error typology (using API types)
interface ErrorCategory extends CategoryOutput {
  id?: string;
  name: string;
  mnemonic?: string;
  description?: string;
  examples?: string[];
  notes?: string;
  level?: number;
  parent?: string;
  subcategories?: ErrorCategory[];
}

interface CategoryWithBreadcrumb extends ErrorCategory {
  breadcrumb: string;
}

export const BubbleMenu: React.FC<BubbleMenuProps> = ({
  visible,
  position,
  currentSelection,
  annotationLevel,
  isCreatingAnnotation,

  contextAnnotation,
  onAddAnnotation,
  onCancel,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedErrorCategory, setSelectedErrorCategory] =
    useState<CategoryWithBreadcrumb | null>(null);
  const [selectedStructuralType, setSelectedStructuralType] =
    useState<StructuralAnnotationType | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);
  const { currentUser } = useAuth();

  // Get annotation mode from Zustand store
  const { currentNavigationMode: annotationMode } = useAnnotationStore();
  const { selectedAnnotationListType } = useAnnotationFiltersStore();

  // Determine the effective annotation mode based on context
  const getEffectiveAnnotationMode = (): "error-list" | "table-of-contents" => {
    // If we have a context annotation (editing existing annotation),
    // determine mode based on its type
    if (contextAnnotation) {
      return isStructuralAnnotationType(contextAnnotation.type)
        ? "table-of-contents"
        : "error-list";
    }

    // Otherwise use the passed annotation mode (from NavigationModeSelector)
    return annotationMode;
  };

  const effectiveMode = getEffectiveAnnotationMode();

  // Load error list data from server using custom hook (only when in error-list mode)
  const {
    data: errorData,
    isLoading: loading,
    error,
  } = useAnnotationListHierarchical({
    type_id: selectedAnnotationListType || "",
    enabled: effectiveMode === "error-list" && !!selectedAnnotationListType,
  });

  // Reset selected items when mode or context changes, but preserve level selection
  useEffect(() => {
    setSelectedErrorCategory(null);
    setSelectedStructuralType(null);
    setSearchQuery("");
    setIsSearchFocused(false);
    // Reset level when mode or context changes
    setSelectedLevel("");
    setShowDropdown(false);
  }, [annotationMode, contextAnnotation, selectedAnnotationListType]);

  // Reset selected items when text selection changes (but preserve level)
  useEffect(() => {
    setSelectedErrorCategory(null);
    setSelectedStructuralType(null);
    setSearchQuery("");
    setIsSearchFocused(false);
    setShowDropdown(false);
  }, [currentSelection, selectedAnnotationListType]);

  // Helper function to flatten error categories
  const flattenCategories = (
    categories: ErrorCategory[],
    result: ErrorCategory[] = []
  ): ErrorCategory[] => {
    for (const category of categories) {
      result.push(category);
      if (category.subcategories) {
        flattenCategories(category.subcategories, result);
      }
    }
    return result;
  };

  // Helper function to get innermost categories
  const getInnermostCategories = (
    categories: ErrorCategory[]
  ): ErrorCategory[] => {
    const allCategories = flattenCategories(categories);
    return allCategories.filter(
      (cat) => !cat.subcategories || cat.subcategories.length === 0
    );
  };

  // Helper function to build breadcrumb
  const buildBreadcrumb = (category: ErrorCategory): string => {
    if (!errorData?.categories) return category.name;

    const allCategories = flattenCategories(
      errorData.categories
    );
    const breadcrumbParts: string[] = [category.name];
    let current = category;

    while (current.parent) {
      const parent = allCategories.find((cat) => cat.id === current.parent);
      if (parent) {
        breadcrumbParts.unshift(parent.name);
        current = parent;
      } else {
        break;
      }
    }

    return breadcrumbParts.join(" > ");
  };

  // Filter items based on mode
  const filteredItems = useMemo((): (StructuralAnnotationType | CategoryWithBreadcrumb)[] => {
    if (effectiveMode === "table-of-contents") {
      // Filter structural annotation types
      if (!searchQuery.trim()) {
        return STRUCTURAL_ANNOTATION_TYPES;
      }

      const query = searchQuery.toLowerCase();
      return STRUCTURAL_ANNOTATION_TYPES.filter(
        (type) =>
          type.name.toLowerCase().includes(query) ||
          type.description.toLowerCase().includes(query) ||
          (type.examples &&
            type.examples.some((ex) => ex.toLowerCase().includes(query)))
      );
    } else {
      // Filter error categories
      if (!errorData?.categories) return [];

      const innermostCategories = getInnermostCategories(
        errorData.categories
      );

      if (!searchQuery.trim()) {
        return innermostCategories.map((category) => ({
          ...category,
          breadcrumb: buildBreadcrumb(category),
        }));
      }

      const query = searchQuery.toLowerCase();
      const matchingCategories = innermostCategories.filter(
        (cat) =>
          cat.name.toLowerCase().includes(query) ||
          cat.description?.toLowerCase().includes(query) ||
          cat.mnemonic?.toLowerCase().includes(query) ||
          (cat.examples &&
            cat.examples.some((ex) => ex.toLowerCase().includes(query)))
      );

      return matchingCategories.map((category) => ({
        ...category,
        breadcrumb: buildBreadcrumb(category),
      }));
    }
  }, [errorData, searchQuery, effectiveMode]);

  if (!visible || !currentSelection) return null;

  const handleAddAnnotation = () => {
    console.log("add annotation")
    if (currentSelection) {
      if (effectiveMode === "table-of-contents" && selectedStructuralType) {

        onAddAnnotation(
          selectedStructuralType.id,
          undefined,
          annotationLevel || undefined
        );
      } else if (selectedErrorCategory) {
        onAddAnnotation(
          selectedErrorCategory.name,
          undefined,
          selectedLevel || undefined
        );
      }
    }
  };

  const handleErrorSelection = (errorCategory: CategoryWithBreadcrumb) => {
    console.log("errorCategory", errorCategory);
    setSelectedErrorCategory(errorCategory);
    setSearchQuery("");
    setIsSearchFocused(false);
    setShowDropdown(false);
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    if (effectiveMode === "error-list") {
      setShowDropdown(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding to allow dropdown clicks
    setTimeout(() => {
      setIsSearchFocused(false);
      if (effectiveMode === "error-list") {
        setShowDropdown(false);
      }
    }, 200);
  };

  const handleCancel = () => {
    onCancel();
  };

  const searchPlaceholder =
    effectiveMode === "table-of-contents"
      ? "Search structural types..."
      : "Search error categories...";

  const canSubmit =
    effectiveMode === "table-of-contents"
      ? selectedStructuralType !== null
      : selectedErrorCategory !== null;

  const modalContent = (
    <div
      className="fixed bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 w-[380px] max-w-[90vw] overflow-hidden"
      style={{
        left: `max(${position.x}px, 5vw)`,
        right: `max(calc(100vw - ${position.x}px), 5vw)`,
        top: `${position.y}px`,
        transform: `translateX(${position.transformX})`,
      }}
    >
      {/* Close button */}
      <Button
        onClick={handleCancel}
        disabled={isCreatingAnnotation}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
      >
        <IoClose className="w-4 h-4" />
      </Button>

      <div className="mb-3 pr-8 overflow-hidden">
        {isCreatingAnnotation ? (
          <div className="text-xs text-blue-600 mb-3 flex items-center gap-2">
            <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin" />
            <span className="font-medium">Creating annotation...</span>
          </div>
        ) : (
          <p className="text-xs text-gray-500 mb-3">
            {effectiveMode === "table-of-contents"
              ? "Choose structural type:"
              : "Choose error type:"}
          </p>
        )}

        {/* Search box - only show for error-list mode or if no error selected */}
        {!isCreatingAnnotation &&
          (annotationMode === "table-of-contents" ||
            !selectedErrorCategory) && (
            <div className="mb-3">
              <div className="relative">
                <IoSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  placeholder={searchPlaceholder}
                  className={`w-full pl-7 pr-8 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-transparent min-w-0 ${
                    searchQuery.trim() || isSearchFocused
                      ? "border-orange-300 bg-orange-50"
                      : "border-gray-300"
                  }`}
                />
                {(searchQuery || isSearchFocused) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchFocused(false);
                      setShowDropdown(false);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 hover:text-gray-600"
                  >
                    <IoClose className="w-3 h-3" />
                  </button>
                )}
              </div>
              {(searchQuery || isSearchFocused) &&
                annotationMode === "error-list" && (
                  <p className="text-xs text-gray-500 mt-1">
                    {searchQuery
                      ? `${filteredItems.length} errors found`
                      : `${filteredItems.length} total errors`}
                  </p>
                )}
            </div>
          )}

        {/* Selected Error Display - for error-list mode */}
        {effectiveMode === "error-list" && selectedErrorCategory && (
          <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">Selected Error:</p>
              <button
                onClick={() => {
                  setSelectedErrorCategory(null);
                  setSelectedLevel("");
                }}
                className="text-gray-400 hover:text-gray-600"
                title="Clear selection"
              >
                <IoClose className="w-3 h-3" />
              </button>
            </div>
            <div className="text-sm font-medium text-orange-900">
              {selectedErrorCategory.name}
            </div>
            {selectedErrorCategory.breadcrumb && (
              <div className="text-xs text-orange-700 mt-1">
                {selectedErrorCategory.breadcrumb}
              </div>
            )}
            <div className="text-xs font-mono text-orange-600 mt-1">
              {selectedErrorCategory.mnemonic} • L{selectedErrorCategory.level}
            </div>
          </div>
        )}

        {/* Level Selection - for error-list mode */}
        {effectiveMode === "error-list" && selectedErrorCategory && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">
              Importance level (optional):
            </p>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              disabled={isCreatingAnnotation}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">Select level...</option>
              <option value="minor">🟢 Minor</option>
              <option value="major">🟡 Major</option>
              <option value="critical">🔴 Critical</option>
            </select>
          </div>
        )}

        {/* Loading/error states */}
        {loading && effectiveMode === "error-list" && (
          <div className="text-center py-4">
            <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-xs text-gray-500">Loading error types...</p>
          </div>
        )}

        {error && effectiveMode === "error-list" && (
          <div className="text-center py-4">
            <p className="text-xs text-red-500">
              {error instanceof Error ? error.message : 'Failed to load error list'}
            </p>
          </div>
        )}

        {/* Items list */}
        {!loading && !error && !selectedErrorCategory && !selectedStructuralType && (
          <div className="max-h-60 overflow-y-auto overflow-x-hidden">
            <div className="space-y-1">
              {filteredItems.slice(0, 20).map((item) => {
                const isStructural = effectiveMode === "table-of-contents";
                
                // Type-safe access to item properties based on mode
                const itemId: string = isStructural 
                  ? (item as StructuralAnnotationType).id 
                  : ((item as CategoryWithBreadcrumb).id ?? '');
                
                // Since this block only renders when both selections are null, 
                // no item is selected
                const isSelected: boolean = false;

                return (
                  <Button
                    key={itemId}
                    onClick={() => {
                      if (isStructural) {
                        setSelectedStructuralType(
                          item as StructuralAnnotationType
                        );
                      } else {
                        setSelectedErrorCategory(
                          item as CategoryWithBreadcrumb
                        );
                      }
                      setSearchQuery("");
                    }}
                    disabled={isCreatingAnnotation}
                    variant="ghost"
                    className={`w-full h-auto p-2 justify-start text-left transition-all duration-200 border-l-2 ${
                      isSelected
                        ? "border-orange-400 bg-orange-50 text-orange-900"
                        : "border-transparent hover:border-orange-200 hover:bg-orange-25"
                    }`}
                  >
                    <div className="w-full overflow-hidden">
                      <div className="flex-1 min-w-0 space-y-1">
                        {isStructural ? (
                          // Structural annotation display
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              {(item as StructuralAnnotationType).icon && (
                                <span className="text-sm flex-shrink-0">
                                  {(item as StructuralAnnotationType).icon}
                                </span>
                              )}
                              <div className="text-sm font-medium truncate min-w-0 flex-1">
                                {item.name}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 leading-tight break-words">
                              {item.description}
                            </div>
                          </>
                        ) : (
                          // Error category display (preserving original layout)
                          <>
                            <div className="text-sm font-medium truncate">
                              {item.name}
                            </div>
                            {(item as CategoryWithBreadcrumb).breadcrumb && (
                              <div className="text-xs text-gray-600 truncate">
                                {(item as CategoryWithBreadcrumb).breadcrumb}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 leading-tight">
                              {item.description}
                            </div>
                            <div className="text-xs font-mono opacity-70">
                              {(item as CategoryWithBreadcrumb).mnemonic} • L
                              {(item as CategoryWithBreadcrumb).level}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </Button>
                );
              })}

              {filteredItems.length === 0 && (
                <p className="text-xs text-gray-500 italic px-3 py-4 text-center">
                  No items found matching your search.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Add Annotation Button - for error-list mode when error is selected */}
        {effectiveMode === "error-list" &&
          selectedErrorCategory &&
          !isCreatingAnnotation && (
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
                      ({selectedErrorCategory.mnemonic}
                      {selectedLevel ? ` • ${selectedLevel}` : ""})
                    </span>
                  </div>
                )}
              </Button>
            </div>
          )}

        {/* Action buttons - for TOC mode */}
        {effectiveMode === "table-of-contents" && !isCreatingAnnotation && (
          <div className="flex gap-2 pt-3 border-t">
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAnnotation}
              disabled={!canSubmit}
              size="sm"
              className="flex-1 text-xs bg-orange-500 hover:bg-orange-600"
            >
              {isCreatingAnnotation ? (
                <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Error dropdown that appears above the modal (only for error-list mode)
  const errorDropdown = showDropdown &&
    effectiveMode === "error-list" &&
    !loading &&
    !error &&
    errorData && (
      <div
        className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[60] max-w-[400px] max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 animate-in fade-in-0 slide-in-from-top-2 duration-200"
        style={{
          left: `max(${position.x}px, 5vw)`,
          bottom: `calc(100vh - ${position.y}px + 10px)`, // Position above the modal with gap
          transform: `translateX(${position.transformX})`,
          minWidth: "380px",
        }}
      >
        {/* Small arrow pointing to search input */}
        <div className="absolute bottom-[-6px] left-8 w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45"></div>

        <div className="p-2">
          <div className="space-y-1">
            {filteredItems.slice(0, 20).map((item) => (
              <Button
                key={(item as CategoryWithBreadcrumb).id}
                onClick={() =>
                  handleErrorSelection(item as CategoryWithBreadcrumb)
                }
                disabled={isCreatingAnnotation}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-16 px-3 py-2 text-left transition-all duration-200 hover:bg-orange-50 hover:border-orange-300"
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {item.name}
                    </div>
                    {(item as CategoryWithBreadcrumb).breadcrumb && (
                      <div className="text-xs text-gray-600 truncate">
                        {(item as CategoryWithBreadcrumb).breadcrumb}
                      </div>
                    )}
                    <div className="text-xs font-mono opacity-70">
                      {(item as CategoryWithBreadcrumb).mnemonic} • L
                      {(item as CategoryWithBreadcrumb).level}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
            {filteredItems.length === 0 && (
              <p className="text-xs text-gray-500 italic px-3 py-4 text-center">
                No errors found matching your search.
              </p>
            )}
          </div>
        </div>
      </div>
    );

  return createPortal(
    <>
      {modalContent}
      {errorDropdown}
    </>,
    document.body
  );
};
