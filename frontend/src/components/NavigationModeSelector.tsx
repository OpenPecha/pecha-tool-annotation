import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IoList,
  IoWarning,
  IoChevronBack,
  IoChevronForward,
} from "react-icons/io5";

import { ErrorList } from "./ErrorList";
import { TableOfContents } from "./TOC/TableOfContents";
import type { Annotation } from "@/pages/Task";
import { useAnnotationStore, type NavigationMode } from "@/store/annotation";

interface NavigationModeSelectorProps {
  // Common props
  isOpen: boolean;
  onToggle: () => void;

  // ErrorList props
  onErrorSelect?: (error: unknown) => void;
  searchable?: boolean;

  // TableOfContents props
  annotations: Annotation[];
  onHeaderClick: (annotation: Annotation) => void;
  onRemoveAnnotation: (id: string) => void;
  pendingHeader?: { text: string; start: number; end: number } | null;
  onHeaderNameSubmit?: (name: string) => void;
  onHeaderNameCancel?: () => void;
  readOnly?: boolean;

  // Mode selector props (removed - using Zustand now)
}

export const NavigationModeSelector = ({
  isOpen,
  onToggle,
  onErrorSelect,
  searchable = true,
  annotations,
  onHeaderClick,
  onRemoveAnnotation,
  pendingHeader,
  onHeaderNameSubmit,
  onHeaderNameCancel,
  readOnly = false,
}: NavigationModeSelectorProps) => {
  // Use Zustand store for navigation mode
  const { currentNavigationMode: currentMode, setCurrentNavigationMode } =
    useAnnotationStore();

  const handleModeChange = (mode: NavigationMode) => {
    setCurrentNavigationMode(mode);
  };

  const modeConfig = {
    "error-list": {
      title: "Error List",
      icon: IoWarning,
      iconColor: "text-orange-600",
      bgColor: "hover:bg-orange-50",
    },
    "table-of-contents": {
      title: "Table of Contents",
      icon: IoList,
      iconColor: "text-blue-600",
      bgColor: "hover:bg-blue-50",
    },
  };

  const currentConfig = modeConfig[currentMode];

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
                  <currentConfig.icon className={currentConfig.iconColor} />
                  {currentConfig.title}
                </h3>
                <button
                  onClick={onToggle}
                  className="h-8 w-8 p-0 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center rounded"
                  title={`Close ${currentConfig.title}`}
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
              {currentMode === "error-list" ? (
                <ErrorList
                  onErrorSelect={onErrorSelect}
                  searchable={searchable}
                />
              ) : (
                <div className="flex-1 overflow-hidden">
                  <TableOfContents
                    annotations={annotations}
                    onHeaderClick={onHeaderClick}
                    onRemoveAnnotation={onRemoveAnnotation}
                    isOpen={true} // Always open when in this mode
                    onToggle={() => {}} // No-op since we handle the toggle at this level
                    pendingHeader={pendingHeader}
                    onHeaderNameSubmit={onHeaderNameSubmit}
                    onHeaderNameCancel={onHeaderNameCancel}
                    readOnly={readOnly}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          // Collapsed state
          <div className="p-3 flex flex-col items-center justify-center gap-2">
            <button
              onClick={onToggle}
              className={`h-10 w-10 p-0 ${currentConfig.bgColor} rounded-full shadow-sm border border-gray-200 transition-all duration-200 flex items-center justify-center`}
              title={`Open ${currentConfig.title}`}
            >
              <currentConfig.icon
                className={`${currentConfig.iconColor} text-lg`}
              />
            </button>

            {/* Mode indicator dots */}
            <div className="flex gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  currentMode === "error-list" ? "bg-orange-400" : "bg-gray-300"
                }`}
              />
              <div
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  currentMode === "table-of-contents"
                    ? "bg-blue-400"
                    : "bg-gray-300"
                }`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
