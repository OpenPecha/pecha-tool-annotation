import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  IoClose,
  IoChatbubbleEllipses,
  IoCheckmarkCircle,
  IoCloseCircle,
} from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import {
  loadAnnotationConfig,
  type AnnotationConfig,
  type AnnotationOption,
} from "@/config/annotation-options";
import type { Annotation } from "@/pages/Task";
import { useUmamiTracking, getUserContext } from "@/hooks/use-umami-tracking";
import { useAuth } from "@/auth/use-auth-hook";

interface EditPopupProps {
  visible: boolean;
  position: { x: number; y: number };
  annotation: Annotation | null;
  isUpdatingAnnotation?: boolean;
  onUpdate: (annotationId: string, newType: string, newText?: string) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export const EditPopup: React.FC<EditPopupProps> = ({
  visible,
  position,
  annotation,
  isUpdatingAnnotation = false,
  onUpdate,
  onDelete,
  onCancel,
}) => {
  const [annotationConfig, setAnnotationConfig] =
    useState<AnnotationConfig | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [annotationText, setAnnotationText] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const { currentUser } = useAuth();
  const { trackButtonClicked } = useUmamiTracking();

  // Load annotation configuration
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

  // Initialize form values when annotation changes
  useEffect(() => {
    if (annotation) {
      setSelectedType(annotation.type);
      setAnnotationText(annotation.name || "");
      setSelectedLevel(annotation.level || "");
    }
  }, [annotation]);

  if (!visible || !annotation || !annotationConfig) return null;

  // Additional safeguard: Don't allow editing of agreed annotations
  if (annotation.is_agreed) {
    return (
      <div
        className="edit-popup absolute bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 min-w-[400px] max-w-[500px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
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
              "
              {annotation.text.length > 100
                ? annotation.text.substring(0, 100) + "..."
                : annotation.text}
              "
            </p>
            <p className="text-xs text-green-600 mt-2">
              Type:{" "}
              <span className="font-medium capitalize">{annotation.type}</span>
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

  const handleUpdate = () => {
    if (selectedType) {
      trackButtonClicked("update-annotation", "edit-popup-update", {
        ...getUserContext(currentUser),
        metadata: {
          annotation_id: annotation.id,
          old_type: annotation.type,
          new_type: selectedType,
        },
      });
      onUpdate(annotation.id, selectedType, annotationText);
    }
  };

  const handleDelete = () => {
    trackButtonClicked("delete-annotation", "edit-popup-delete", {
      ...getUserContext(currentUser),
      metadata: {
        annotation_id: annotation.id,
        annotation_type: annotation.type,
      },
    });
    onDelete();
  };

  const hasChanges =
    selectedType !== annotation.type ||
    annotationText !== (annotation.name || "") ||
    selectedLevel !== (annotation.level || "");

  return (
    <div
      className="edit-popup absolute bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 min-w-[400px] max-w-[500px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
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
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Edit Annotation
        </h3>

        {/* Current annotation text */}
        <div className="mb-3 p-2 bg-gray-50 rounded border">
          <p className="text-xs text-gray-500 mb-1">Selected text:</p>
          <p className="text-sm text-gray-700">
            "
            {annotation.text.length > 100
              ? annotation.text.substring(0, 100) + "..."
              : annotation.text}
            "
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

        {/* Annotation Type Selection */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">Annotation type:</p>
          <div className="flex flex-wrap gap-2">
            {annotationConfig.options.map((option: AnnotationOption) => (
              <Button
                key={option.id}
                onClick={() => setSelectedType(option.id)}
                disabled={isUpdatingAnnotation}
                size="sm"
                variant={selectedType === option.id ? "default" : "outline"}
                className={`px-3 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedType === option.id
                    ? "ring-2 ring-blue-500"
                    : "hover:scale-105"
                }`}
                style={
                  selectedType === option.id
                    ? {
                        backgroundColor: option.borderColor,
                        color: option.color,
                        borderColor: option.borderColor,
                      }
                    : {
                        borderColor: option.borderColor,
                        color: option.borderColor,
                      }
                }
              >
                {option.icon && (
                  <span className="text-xs mr-1">{option.icon}</span>
                )}
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Level Selection */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">
            Importance level (optional):
          </p>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            disabled={isUpdatingAnnotation}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="">Select level...</option>
            <option value="minor">🟢 Minor</option>
            <option value="major">🟡 Major</option>
            <option value="critical">🔴 Critical</option>
          </select>
        </div>

        {/* Annotation Text/Name */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Add a note (optional)..."
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onCancel();
              } else if (e.key === "Enter" && hasChanges && selectedType) {
                handleUpdate();
              }
            }}
            disabled={isUpdatingAnnotation}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-between">
          <Button
            onClick={handleDelete}
            disabled={isUpdatingAnnotation}
            variant="destructive"
            size="sm"
            className="px-3 py-2 text-sm"
          >
            {isUpdatingAnnotation ? (
              <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin mr-1" />
            ) : null}
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
              onClick={handleUpdate}
              disabled={!hasChanges || !selectedType || isUpdatingAnnotation}
              size="sm"
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUpdatingAnnotation ? (
                <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin mr-1" />
              ) : null}
              Update
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
