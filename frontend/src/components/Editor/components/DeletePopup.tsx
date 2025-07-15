import React from "react";
import { Button } from "@/components/ui/button";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import {
  IoChatbubbleEllipses,
  IoCheckmarkCircle,
  IoCloseCircle,
} from "react-icons/io5";
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

        {/* Review Comments Section */}
        {annotation.reviews && annotation.reviews.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <IoChatbubbleEllipses className="h-3 w-3" />
              <span>Reviewer Comments:</span>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {annotation.reviews.map((review) => (
                <div
                  key={review.id}
                  className={`p-2 rounded border text-xs ${
                    review.decision === "agree"
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    {review.decision === "agree" ? (
                      <IoCheckmarkCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <IoCloseCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span
                      className={`font-medium ${
                        review.decision === "agree"
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {review.decision === "agree" ? "Agreed" : "Disagreed"}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 italic line-clamp-2">
                      "{review.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
