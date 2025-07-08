import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IoClose } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import type { BubbleMenuProps } from "../types";
import {
  loadAnnotationConfig,
  type AnnotationConfig,
  type AnnotationOption,
} from "@/config/annotation-options";

export const BubbleMenu: React.FC<BubbleMenuProps> = ({
  visible,
  position,
  currentSelection,
  annotationText,
  selectedHeaderId,
  annotations,
  isCreatingAnnotation,
  onAddAnnotation,
  onCancel,
  onAnnotationTextChange,
  onSelectedHeaderIdChange,
  onUpdateHeaderSpan,
}) => {
  const [annotationConfig, setAnnotationConfig] =
    useState<AnnotationConfig | null>(null);

  // Load annotation configuration on component mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await loadAnnotationConfig();
        setAnnotationConfig(config);
      } catch (error) {
        console.error("Failed to load annotation configuration:", error);
      }
    };
    loadConfig();
  }, []);

  if (!visible || !currentSelection) return null;

  return (
    <div
      className="absolute bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 min-w-[380px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translateX(${position.transformX})`,
        maxWidth: "90vw", // Prevent modal from being too wide on small screens
      }}
    >
      {/* Close button */}
      <Button
        onClick={onCancel}
        disabled={isCreatingAnnotation}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <IoClose className="w-4 h-4" />
      </Button>

      <div className="mb-3 pr-8">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Selected: "
          {currentSelection.text.length > 50
            ? currentSelection.text.substring(0, 50) + "..."
            : currentSelection.text}
          "
        </p>
        <p className="text-xs text-gray-500 mb-3">
          {isCreatingAnnotation
            ? "Creating annotation..."
            : "Choose annotation type:"}
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {annotationConfig?.options.map((option: AnnotationOption) => (
            <Button
              key={option.id}
              onClick={() => onAddAnnotation(option.id)}
              disabled={isCreatingAnnotation}
              size="sm"
              className="px-4 py-2 text-white rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: option.borderColor,
                color: option.color,
              }}
              onMouseEnter={(e) => {
                if (!isCreatingAnnotation) {
                  e.currentTarget.style.opacity = "0.8";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCreatingAnnotation) {
                  e.currentTarget.style.opacity = "1";
                }
              }}
            >
              {isCreatingAnnotation ? (
                <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin" />
              ) : (
                option.icon && <span className="text-xs">{option.icon}</span>
              )}
              {option.label}
            </Button>
          ))}
        </div>

        {/* Update existing header section */}
        {annotations.filter((ann) => ann.type === "header").length > 0 && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border">
            <p className="text-xs text-gray-500 mb-2">
              Or update existing header:
            </p>
            <div className="flex gap-2">
              <select
                value={selectedHeaderId}
                onChange={(e) => onSelectedHeaderIdChange(e.target.value)}
                disabled={isCreatingAnnotation}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">Select a header...</option>
                {annotations
                  .filter((ann) => ann.type === "header")
                  .map((header) => (
                    <option key={header.id} value={header.id}>
                      {header.name && header.name.length > 30
                        ? header.name.substring(0, 30) + "..."
                        : header.name || header.text}
                    </option>
                  ))}
              </select>
              <Button
                onClick={onUpdateHeaderSpan}
                disabled={!selectedHeaderId || isCreatingAnnotation}
                size="sm"
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingAnnotation ? (
                  <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin mr-1" />
                ) : null}
                Update
              </Button>
            </div>
          </div>
        )}
      </div>

      <div>
        <input
          type="text"
          placeholder="Add a note (optional)..."
          value={annotationText}
          onChange={(e) => onAnnotationTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onCancel();
            }
          }}
          disabled={isCreatingAnnotation}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
        />
      </div>
    </div>
  );
};
