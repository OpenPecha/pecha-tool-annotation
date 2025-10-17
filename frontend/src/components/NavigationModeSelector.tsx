import {
  IoWarning,
  IoChevronBack,
} from "react-icons/io5";

import { useAnnotationStore } from "@/store/annotation";
import { AnnotationList } from "./AnnotationList";
import { useAnnotationTypes } from "@/hooks";
import { useAnnotationFiltersStore } from "@/store/annotationFilters";

interface NavigationModeSelectorProps {
  // Common props
  isOpen: boolean;
  onToggle: () => void;

  // ErrorList props
  onErrorSelect?: (error: unknown) => void;
  searchable?: boolean;

}

export const NavigationModeSelector = ({
  isOpen,
  onToggle,
  onErrorSelect,
  searchable = true,
 
}: NavigationModeSelectorProps) => {
  // Use Zustand store for navigation mode
  const { currentNavigationMode: currentMode } =
    useAnnotationStore();

  const { selectedAnnotationListType } = useAnnotationFiltersStore();
  // fetch annotation types
  const { data: annotationTypes = [] } = useAnnotationTypes();
  const annotationType = annotationTypes.find((type) => type.id === selectedAnnotationListType);
  const modeConfig = {
      title: annotationType?.name || "Annotations",
      icon: IoWarning,
      iconColor: "text-orange-600",
      bgColor: "hover:bg-orange-50",
  };


  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        isOpen ? "w-80" : "w-16"
      }`}
    >
      <div
        className={`shadow-lg border-0 backdrop-blur-sm flex flex-col mt-4 mb-4 bg-white/80 rounded-lg transition-all duration-300 ${
          isOpen ? "h-[75vh]" : "h-auto"
        }`}
      >
        {isOpen ? (
          // Expanded state
          <>
            <div className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 p-2">
                  <modeConfig.icon className={modeConfig.iconColor} />
                  {modeConfig.title}
                </h3>
                <button
                  onClick={onToggle}
                  className="h-8 w-8 p-0 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center rounded"
                  title={`Close ${modeConfig.title}`}
                >
                  <IoChevronBack className="text-gray-600" />
                </button>
              </div>

              {/* Mode selector tabs */}
              {/* <div className="flex gap-1 p-2 bg-gray-50 rounded-lg mx-2">
                <button
                  onClick={() => handleModeChange("error-list")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentMode === "error-list"
                      ? "bg-white text-orange-600 shadow-sm"
                      : "text-gray-600 hover:text-orange-600 hover:bg-white/50"
                  }`}
                >
                  <IoWarning className="h-4 w-4" />
                  Errors
                </button>
                <button
                  disabled={true}
                  onClick={() => handleModeChange("table-of-contents")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentMode === "table-of-contents"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-blue-600 hover:bg-white/50"
                  }`}
                >
                  <IoList className="h-4 w-4" />
                  TOC
                </button>
              </div> */}
            </div>

            <div className="pt-0 flex-1 flex flex-col min-h-0 p-4">
                <AnnotationList
                  onErrorSelect={onErrorSelect}
                  searchable={searchable}
                />
        
            </div>
          </>
        ) : (
          // Collapsed state
          <div className="p-3 flex flex-col items-center justify-center gap-2">
            <button
              onClick={onToggle}
              className={`h-10 w-10 p-0 ${modeConfig.bgColor} rounded-full shadow-sm border border-gray-200 transition-all duration-200 flex items-center justify-center`}
              title={`Open ${modeConfig.title}`}
            >
              <modeConfig.icon
                className={`${modeConfig.iconColor} text-lg`}
              />
            </button>

            {/* Mode indicator dots */}
            <div className="flex gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  currentMode === "error-list" ? "bg-orange-400" : "bg-gray-300"
                }`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
