import { useMemo } from "react";
import { IoChevronDown, IoChevronForward } from "react-icons/io5";
import { getDisplayLabelForFilter } from "@/utils/annotationConverter";

/** Annotation shape from API (annotation_type) or UI (type) */
type AnnotationForFilter = {
  type?: string;
  annotation_type?: string;
  label?: string | null;
  name?: string | null;
};

interface AnnotationTypesFilterProps {
  isOpen: boolean;
  onToggle: () => void;
  /** Annotations from API or UI; filter options are derived from display labels (e.g. v.past, n, header) */
  annotations: AnnotationForFilter[];
  loading?: boolean;
  selectedAnnotationTypes: Set<string>;
  onToggleAnnotationType: (displayLabel: string) => void;
  onSelectAllAnnotationTypes: (displayLabels: string[]) => void;
  onDeselectAllAnnotationTypes: () => void;
}

export const AnnotationTypesFilter = ({
  isOpen,
  onToggle,
  annotations,
  loading = false,
  selectedAnnotationTypes,
  onToggleAnnotationType,
  onSelectAllAnnotationTypes,
  onDeselectAllAnnotationTypes,
}: AnnotationTypesFilterProps) => {
  // Get distinct annotation display labels (values) with counts
  const annotationTypesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    annotations.forEach((annotation) => {
      const displayLabel = getDisplayLabelForFilter(annotation);
      if (displayLabel) {
        counts.set(
          displayLabel,
          (counts.get(displayLabel) || 0) + 1
        );
      }
    });
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [annotations]);

  // Handle toggle all
  const handleToggleAll = () => {
    if (selectedAnnotationTypes.size === annotationTypesWithCounts.length) {
      onDeselectAllAnnotationTypes();
    } else {
      onSelectAllAnnotationTypes(annotationTypesWithCounts.map(item => item.type));
    }
  };

  return (
    <div className="mb-3 flex-shrink-0 border border-gray-300 rounded">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded"
      >
        <span className="text-xs font-medium text-gray-700">
          Filter by Annotations
        </span>
        {isOpen ? (
          <IoChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <IoChevronForward className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="p-3 border-t border-gray-300 bg-white">
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <span className="inline-block w-4 h-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              <p className="text-xs text-gray-500">Updating...</p>
            </div>
          ) : annotationTypesWithCounts.length === 0 ? (
            <p className="text-xs text-gray-500">No annotation types available</p>
          ) : (
            <div className="space-y-2">
              {/* Select All / Deselect All */}
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <input
                  type="checkbox"
                  id="select-all-annotation-types"
                  checked={selectedAnnotationTypes.size === annotationTypesWithCounts.length && annotationTypesWithCounts.length > 0}
                  onChange={handleToggleAll}
                  className="w-3.5 h-3.5 text-orange-500 border-gray-300 rounded focus:ring-orange-400 focus:ring-1 cursor-pointer"
                />
                <label
                  htmlFor="select-all-annotation-types"
                  className="flex-1 cursor-pointer flex items-center justify-between"
                >
                  <div className="text-xs font-medium text-gray-700">
                  {selectedAnnotationTypes.size === annotationTypesWithCounts.length && annotationTypesWithCounts.length > 0
                    ? "Deselect All"
                    : "Select All"}</div>
                  <span className="text-xs text-gray-500 mr-3">[{annotations.length}]</span>
                </label>
              </div>

              {/* Annotation types list with max height and scroll */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {annotationTypesWithCounts.map(({ type, count }) => (
                  <div
                    key={type}
                    className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      id={`annotation-type-${type}`}
                      checked={selectedAnnotationTypes.has(type)}
                      onChange={() => onToggleAnnotationType(type)}
                      className="w-3.5 h-3.5 text-orange-500 border-gray-300 rounded focus:ring-orange-400 focus:ring-1 cursor-pointer mt-0.5 flex-shrink-0"
                    />
                    <label
                      htmlFor={`annotation-type-${type}`}
                      className="flex-1 cursor-pointer flex items-center justify-between"
                    >
                      <div className="text-xs font-medium text-gray-900">
                        {type}
                      </div>
                      <span className="text-xs text-gray-500 ml-2">
                        {`[${count}]`}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

