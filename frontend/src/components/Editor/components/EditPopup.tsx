import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  IoClose,
  IoAdd,
  IoSearch,
  IoChatbubbleEllipses,
  IoCheckmarkCircle,
  IoCloseCircle,
} from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import {
  extractLeafNodes,
  type AnnotationOption,
} from "@/config/annotation-options";
import { allowsCustomValues } from "@/config/custom-annotation-values";
import type { Annotation } from "@/utils/annotationConverter";
import { getAnnotationDisplayLabel } from "@/utils/annotationConverter";
import { truncateText } from "@/lib/utils";
import { useAnnotationFiltersStore } from "@/store/annotationFilters";
import { useCustomAnnotationsStore } from "@/store/customAnnotations";
import { useAnnotationListHierarchical, useAnnotationTypes } from "@/hooks/";

interface EditPopupProps {
  visible: boolean;
  position: { x: number; y: number };
  annotation: Annotation | null;
  /** Full document content - used to derive selected text so display matches document (fixes XML encoding issues) */
  content?: string;
  isUpdatingAnnotation?: boolean;
  onUpdate: (
    annotationId: string,
    newLabel: string,
    newText?: string,
    newLevel?: string,
    /** Move the annotation to a different annotation type; omit to keep the current one. */
    newAnnotationType?: string,
  ) => void;
  onDelete: () => void;
  onCancel: () => void;
}

/** Styling for an option synthesised outside the type's list (current value, custom entry). */
const LOOSE_OPTION_STYLE = {
  color: "#ffffff",
  backgroundColor: "rgba(249, 115, 22, 0.2)",
  borderColor: "#f97316",
  icon: "⚠️",
};

export const EditPopup: React.FC<EditPopupProps> = ({
  visible,
  position,
  annotation,
  content,
  isUpdatingAnnotation = false,
  onUpdate,
  onDelete,
  onCancel,
}) => {
  const [selectedTypeName, setSelectedTypeName] = useState<string>("");
  const [isChoosingType, setIsChoosingType] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [customInput, setCustomInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedAnnotationListType } = useAnnotationFiltersStore();
  const { getCustomOptions, addCustomAnnotation, customOptionsByListType } =
    useCustomAnnotationsStore();
  const { data: annotationTypes = [] } = useAnnotationTypes();

  const originalTypeName = annotation?.type ?? "";
  const typeChanged =
    !!selectedTypeName && selectedTypeName !== originalTypeName;

  // The label list follows the selected type, so switching type reloads the
  // labels the annotation can be given.
  const listTypeId =
    selectedTypeName !== ""
      ? (annotationTypes.find((t) => t.name === selectedTypeName)?.id ?? "")
      : selectedAnnotationListType;

  const { data: annotationList, isLoading: isLoadingList } =
    useAnnotationListHierarchical({
      type_id: listTypeId,
      enabled: !!listTypeId,
    });

  const displayLabel = annotation ? getAnnotationDisplayLabel(annotation) : "";

  useEffect(() => {
    if (annotation) {
      setSelectedTypeName(annotation.type ?? "");
      setSelectedLabel(getAnnotationDisplayLabel(annotation));
      setIsChoosingType(false);
      setSearchQuery("");
      setCustomInput("");
    }
  }, [annotation]);

  /** Options from the type's list, plus custom ones, plus the current value if it is in neither. */
  const options = useMemo((): AnnotationOption[] => {
    const fromList = annotationList?.categories
      ? extractLeafNodes(annotationList.categories, 0)
      : [];
    const custom = listTypeId ? getCustomOptions(listTypeId) : [];
    const all = [...fromList, ...custom];
    // The existing label belongs to the original type, so only offer it while
    // that type is still selected.
    if (
      !typeChanged &&
      displayLabel &&
      !all.some((o) => o.label === displayLabel || o.id === displayLabel)
    ) {
      all.push({
        id: displayLabel,
        label: displayLabel,
        ...LOOSE_OPTION_STYLE,
      });
    }
    return all;
    // customOptionsByListType is the store slice that changes when a custom value is added
  }, [
    annotationList,
    listTypeId,
    displayLabel,
    typeChanged,
    getCustomOptions,
    customOptionsByListType,
  ]);

  const filteredTypes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return annotationTypes;
    return annotationTypes.filter((t) => t.name.toLowerCase().includes(q));
  }, [annotationTypes, searchQuery]);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q) ||
        o.mnemonic?.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q),
    );
  }, [options, searchQuery]);

  if (!visible || !annotation) return null;

  // Additional safeguard: Don't allow editing of agreed annotations
  if (annotation.is_agreed) {
    return (
      <div
        className="edit-popup fixed bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 min-w-[400px] max-w-[500px] overflow-y-auto"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          // Position math upstream only estimates this popup's height; this is
          // what actually guarantees it never renders taller than the viewport
          // (with its own scrollbar) on short laptop screens.
          maxHeight: `calc(100vh - ${position.y}px - 10px)`,
          transform: "translateX(-50%)",
        }}
      >
        {/* Close button */}
        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <IoClose className="w-4 h-4" />
        </Button>

        <div className="mb-3 pr-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-green-600 text-lg">🔒</div>
            <h3 className="text-sm font-semibold text-green-700">
              Annotation Locked
            </h3>
          </div>

          {/* Current annotation text */}
          <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-600 mb-1">
              This annotation has been approved:
            </p>
            <p className="text-sm text-green-700 font-medium">
              "{truncateText(annotation.text, 100)}"
            </p>
            <p className="text-xs text-green-600 mt-2">
              Type:{" "}
              <span className="font-medium capitalize">{displayLabel}</span>
              {annotation.name && <span> • Note: "{annotation.name}"</span>}
            </p>
          </div>

          {/* Reviewer Comments Section */}
          {annotation.reviews && annotation.reviews.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <IoChatbubbleEllipses className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Reviewer Feedback
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {annotation.reviews.map((review, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded-md border ${
                      review.decision === "agree"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {review.decision === "agree" ? (
                        <IoCheckmarkCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <IoCloseCircle className="w-3 h-3 text-red-600" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          review.decision === "agree"
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {review.decision === "agree"
                          ? "Approved"
                          : "Needs Revision"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p
                        className={`text-xs italic ${
                          review.decision === "agree"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        "{review.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center p-3 bg-gray-50 rounded-lg border">
            <p className="text-xs text-gray-600">
              This annotation has been approved by a reviewer and cannot be
              edited or deleted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const canAddCustomValue = allowsCustomValues(selectedTypeName);
  const labelChanged = selectedLabel.trim() !== displayLabel;
  const hasChanged = labelChanged || typeChanged;
  const canSave = hasChanged && !!selectedLabel.trim() && !isChoosingType;

  const handleDelete = () => {
    onDelete();
  };

  /**
   * Relabel in place. Both label and name are set: the display prefers name,
   * so writing only one of them would leave the annotation looking unchanged.
   * The annotation type moves only when the user picked a different one; the
   * span is untouched either way.
   */
  const handleSave = () => {
    const next = selectedLabel.trim();
    if (!next || !hasChanged) return;
    onUpdate(
      annotation.id,
      next,
      next,
      annotation.level || undefined,
      typeChanged ? selectedTypeName : undefined,
    );
  };

  const chooseType = (typeName: string) => {
    setIsChoosingType(false);
    setSearchQuery("");
    setCustomInput("");
    if (typeName === selectedTypeName) return;
    setSelectedTypeName(typeName);
    // Labels are type-specific, so the old one cannot carry over.
    setSelectedLabel(typeName === originalTypeName ? displayLabel : "");
  };

  const addCustomValue = () => {
    const trimmed = customInput.trim();
    if (!trimmed || !listTypeId) return;
    addCustomAnnotation(listTypeId, trimmed);
    setSelectedLabel(trimmed);
    setCustomInput("");
    setSearchQuery("");
  };

  const displayText =
    content && annotation.start >= 0 && annotation.end <= content.length
      ? content.slice(annotation.start, annotation.end)
      : annotation.text;

  const modalContent = (
    <div
      className="edit-popup fixed bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 min-w-[400px] max-w-[500px] overflow-y-auto"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        // Position math upstream only estimates this popup's height; this is
        // what actually guarantees it never renders taller than the viewport
        // (with its own scrollbar) on short laptop screens.
        maxHeight: `calc(100vh - ${position.y}px - 10px)`,
        transform: "translateX(-50%)",
      }}
    >
      {/* Close button */}
      <Button
        onClick={onCancel}
        disabled={isUpdatingAnnotation}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <IoClose className="w-4 h-4" />
      </Button>

      <div className="mb-3 pr-8">
        {/* Current annotation text - derive from content to match document (fixes XML/TEI encoding issues) */}
        <div className="mb-3 p-2 bg-gray-50 rounded border">
          <p className="text-xs text-gray-500 mb-1">Selected text:</p>
          <p className="text-sm text-gray-700">
            "{truncateText(displayText ?? "", 100)}"
          </p>
        </div>

        {/* Reviewer Comments Section - Prominently displayed */}
        {annotation.reviews && annotation.reviews.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <IoChatbubbleEllipses className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Reviewer Feedback
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {annotation.reviews.map((review, index) => (
                <div
                  key={index}
                  className={`p-2 rounded-md border ${
                    review.decision === "agree"
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {review.decision === "agree" ? (
                      <IoCheckmarkCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <IoCloseCircle className="w-3 h-3 text-red-600" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        review.decision === "agree"
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {review.decision === "agree"
                        ? "Approved"
                        : "Needs Revision"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p
                      className={`text-xs italic ${
                        review.decision === "agree"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      "{review.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Type + label picker: change either in place rather than delete and re-add */}
        <div className="mb-3">
          {/* Annotation type, with the option to move to a different one */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Annotation type:</p>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded border text-sm ${
                  typeChanged
                    ? "bg-orange-50 border-orange-200 text-orange-900 font-medium"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {selectedTypeName || "—"}
              </span>
              {typeChanged && (
                <span className="text-xs text-gray-400">
                  (was {originalTypeName})
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isUpdatingAnnotation}
                onClick={() => {
                  setIsChoosingType((choosing) => !choosing);
                  setSearchQuery("");
                }}
                className="ml-auto text-xs text-gray-600 hover:text-gray-900"
              >
                {isChoosingType ? "Cancel" : "Change type"}
              </Button>
            </div>
          </div>

          {isChoosingType ? (
            <>
              <div className="relative mb-2">
                <IoSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search annotation types..."
                  autoComplete="off"
                  autoFocus
                  className="w-full pl-7 pr-8 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 hover:text-gray-600"
                  >
                    <IoClose className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto overflow-x-hidden border rounded">
                <div className="space-y-1 p-1">
                  {filteredTypes.map((type) => (
                    <Button
                      key={type.id}
                      onClick={() => chooseType(type.name)}
                      variant="ghost"
                      className={`w-full h-auto p-2 justify-start text-left transition-all duration-200 border-l-2 ${
                        type.name === selectedTypeName
                          ? "border-orange-400 bg-orange-50 text-orange-900"
                          : "border-transparent hover:border-orange-200 hover:bg-orange-25"
                      }`}
                    >
                      <div className="text-sm font-medium truncate">
                        {type.name}
                      </div>
                    </Button>
                  ))}

                  {filteredTypes.length === 0 && (
                    <p className="text-xs text-gray-500 italic px-3 py-4 text-center">
                      No annotation types found matching your search.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-2">Label:</p>

              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="px-2 py-1 rounded bg-gray-100 border text-gray-700">
                  {displayLabel || "—"}
                </span>
                {(labelChanged || typeChanged) && (
                  <>
                    <span className="text-gray-400">→</span>
                    <span
                      className={`px-2 py-1 rounded border font-medium ${
                        selectedLabel
                          ? "bg-orange-50 border-orange-200 text-orange-900"
                          : "bg-gray-50 border-dashed border-gray-300 text-gray-400 italic"
                      }`}
                    >
                      {selectedLabel || "pick a label"}
                    </span>
                  </>
                )}
              </div>

              {isLoadingList ? (
                <div className="text-center py-4">
                  <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-xs text-gray-500">Loading labels...</p>
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div className="relative mb-2">
                    <IoSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search labels..."
                      autoComplete="off"
                      disabled={isUpdatingAnnotation}
                      className="w-full pl-7 pr-8 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-transparent disabled:opacity-50"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 hover:text-gray-600"
                      >
                        <IoClose className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Options */}
                  <div className="max-h-48 overflow-y-auto overflow-x-hidden border rounded">
                    <div className="space-y-1 p-1">
                      {filteredOptions.map((option) => {
                        const isSelected = option.label === selectedLabel;
                        return (
                          <Button
                            key={option.id}
                            onClick={() => setSelectedLabel(option.label)}
                            disabled={isUpdatingAnnotation}
                            variant="ghost"
                            className={`w-full h-auto p-2 justify-start text-left transition-all duration-200 border-l-2 ${
                              isSelected
                                ? "border-orange-400 bg-orange-50 text-orange-900"
                                : "border-transparent hover:border-orange-200 hover:bg-orange-25"
                            }`}
                          >
                            <div className="w-full min-w-0">
                              <div className="text-sm font-medium truncate">
                                {option.label}
                              </div>
                              {option.description && (
                                <div className="text-xs text-gray-500 truncate">
                                  {option.description}
                                </div>
                              )}
                            </div>
                          </Button>
                        );
                      })}

                      {filteredOptions.length === 0 && (
                        <p className="text-xs text-gray-500 italic px-3 py-4 text-center">
                          {options.length === 0
                            ? "No labels available for this annotation type."
                            : "No labels found matching your search."}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Add your own value, for types with an open vocabulary */}
                  {canAddCustomValue && listTypeId && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        placeholder="Can't find it? Add your own..."
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        autoComplete="off"
                        disabled={isUpdatingAnnotation}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomValue();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-transparent disabled:opacity-50"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!customInput.trim() || isUpdatingAnnotation}
                        onClick={addCustomValue}
                        className="shrink-0 px-2 py-1.5 text-xs"
                      >
                        <IoAdd className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-between pt-3 border-t">
          <Button
            onClick={handleDelete}
            disabled={isUpdatingAnnotation}
            variant="destructive"
            size="sm"
            className="px-3 py-2 text-sm"
          >
            Delete
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={onCancel}
              disabled={isUpdatingAnnotation}
              variant="outline"
              size="sm"
              className="px-3 py-2 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canSave || isUpdatingAnnotation}
              size="sm"
              className="px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingAnnotation ? (
                <span className="flex items-center gap-2">
                  <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
