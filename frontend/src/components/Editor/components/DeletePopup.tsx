import React from "react";
import { Button } from "@/components/ui/button";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import type { DeletePopupProps } from "../types";

export const DeletePopup: React.FC<DeletePopupProps> = ({
  visible,
  position,
  annotation,
  isDeletingAnnotation,
  onDelete,
  onCancel,
}) => {
  if (!visible || !annotation) return null;

  return (
    <div
      className="delete-popup absolute bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-50 min-w-64"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-700 mb-1">
          Delete Annotation?
        </p>
        <p className="text-xs text-gray-500 mb-2">
          Type:{" "}
          <span className="font-medium capitalize">{annotation.type}</span>
        </p>
        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
          "
          {annotation.text.length > 50
            ? annotation.text.substring(0, 50) + "..."
            : annotation.text}
          "
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={onDelete}
          disabled={isDeletingAnnotation}
          size="sm"
          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isDeletingAnnotation && (
            <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin" />
          )}
          Delete
        </Button>
        <Button
          onClick={onCancel}
          disabled={isDeletingAnnotation}
          variant="outline"
          size="sm"
          className="px-3 py-2 text-gray-600 hover:text-gray-800 rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
