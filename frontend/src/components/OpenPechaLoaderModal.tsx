import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { IoClose, IoAlertCircle } from "react-icons/io5";
import { toast } from "sonner";
import type {
  OpenPechaText,
} from "@/api/openpecha";
import {
  useOpenPechaTexts,
  useOpenPechaInstances,
  useOpenPechaContent,
  useCreateText,
} from "@/hooks";

interface OpenPechaLoaderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenPechaLoaderModal: React.FC<OpenPechaLoaderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [selectedText, setSelectedText] = useState<OpenPechaText | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");

  // Fetch all texts
  const {
    data: texts = [],
    isLoading: isLoadingTexts,
    error: textsError,
  } = useOpenPechaTexts();

  // Fetch instances for selected text
  const {
    data: instances = [],
    isLoading: isLoadingInstances,
    error: instancesError,
  } = useOpenPechaInstances(selectedText?.id || "", !!selectedText?.id);

  // Fetch text content for selected instance
  const {
    data: textContent,
    isLoading: isLoadingContent,
    error: contentError,
  } = useOpenPechaContent(selectedInstanceId, !!selectedInstanceId);

  // Auto-select first instance when instances are loaded
  useEffect(() => {
    if (instances.length > 0 && !selectedInstanceId) {
      setSelectedInstanceId(instances[0].id);
    }
  }, [instances, selectedInstanceId]);

  // Mutation to create text from OpenPecha content
  const loadTextMutation = useCreateText();

  const handleLoadText = () => {
    if (!selectedText?.id || !selectedInstanceId || !textContent) {
      toast.error("Please select all options", {
        description: "You must select a text, version, and segmentation type",
      });
      return;
    }

    // Get the title in the appropriate language (prefer first available)
    const titleKey = Object.keys(selectedText.title)[0];
    const title = selectedText.title[titleKey] || "OpenPecha Text";

    // Process the text with selected segmentation
    const processedContent = getSegmentedText();

    // Create text with OpenPecha content
    loadTextMutation.mutate(
      {
        title: title,
        content: processedContent,
        source: `OpenPecha: ${selectedText.id} | Instance: ${selectedInstanceId}`,
        language: selectedText.language,
      },
      {
        onSuccess: (createdText) => {
          toast.success("✅ Text Loaded from OpenPecha", {
            description: `"${createdText.title}" is ready for annotation`,
          });
          onClose();
          // Reset selections
          resetSelections();
          // Navigate to the task page
          navigate(`/task/${createdText.id}`);
        },
        onError: (error) => {
          console.log("error ::: ", error);
          toast.error("❌ Failed to load text", {
            description:
              error instanceof Error ? error.message : "Please try again",
          });
        },
      }
    );
  };

  // Helper to format title display
  const formatTitle = (title: Record<string, string>): string => {
    const keys = Object.keys(title);
    if (keys.length === 0) return "Untitled";
    return title[keys[0]];
  };

  // Handle errors
  useEffect(() => {
    if (textsError && isOpen) {
      toast.error("Failed to load OpenPecha texts", {
        description:
          textsError instanceof Error
            ? textsError.message
            : "Please try again later",
      });
    }
  }, [textsError, isOpen]);

  useEffect(() => {
    if (instancesError && isOpen) {
      toast.error("Failed to load text instances", {
        description:
          instancesError instanceof Error
            ? instancesError.message
            : "Please try again",
      });
    }
  }, [instancesError, isOpen]);

  useEffect(() => {
    if (contentError && isOpen) {
      toast.error("Failed to load text content", {
        description:
          contentError instanceof Error
            ? contentError.message
            : "Please try again",
      });
    }
  }, [contentError, isOpen]);

  // Reset dependent selections when parent changes
  const handleTextChange = (value: string) => {
    setSelectedText(texts.find((t) => t.id === value) || null);
    setSelectedInstanceId("");
  };

  const handleInstanceChange = (value: string) => {
    setSelectedInstanceId(value);
  };

  const resetSelections = () => {
    setSelectedText(null);
    setSelectedInstanceId("");
  };

  const handleClose = () => {
    if (!loadTextMutation.isPending) {
      resetSelections();
      onClose();
    }
  };

  // Get preview text
  const getSegmentedText = (): string => {
    if (!textContent) return "";
    const segments = textContent.annotations.segmentation || [];
    const baseText = textContent.base || "";

    const previewText = segments.map(seg => {
        const { span } = seg;
        const text = baseText.slice(span.start, span.end);
        return text;
      });

    return previewText.join("\n");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl m-4">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8 text-indigo-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Load from OpenPecha
              </h2>
              <p className="text-sm text-gray-600">
                Import text directly from the OpenPecha library
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loadTextMutation.isPending}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Text Selection Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              Select Text
            </label>
            <Select
              value={selectedText?.id}
              onValueChange={handleTextChange}
              disabled={loadTextMutation.isPending}
            >
              <SelectTrigger disabled={isLoadingTexts} className="focus:ring-0 ring-0 focus:outline-none focus:ring-offset-0">
                <SelectValue placeholder={`${isLoadingTexts ? "Loading texts..." : "Choose a Pecha..."}`} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTexts ? (
                  <div className="p-4 text-center">
                    <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <p className="text-sm text-gray-500">Loading texts...</p>
                  </div>
                ) : textsError ? (
                  <div className="p-4 text-center">
                    <IoAlertCircle className="w-5 h-5 mx-auto mb-2 text-red-500" />
                    <p className="text-sm text-red-600">Failed to load texts</p>
                  </div>
                ) : texts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No texts available
                  </div>
                ) : (
                  texts.map((text) => (
                    <SelectItem key={text.id} value={text.id}>
                      {formatTitle(text.title)} 
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Instance/Version Selection Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              Select Version
            </label>
            <Select
              value={selectedInstanceId}
              onValueChange={handleInstanceChange}
              disabled={
                !selectedText?.id ||
                isLoadingInstances ||
                loadTextMutation.isPending
              }
            >
              <SelectTrigger disabled={isLoadingInstances} className="focus:ring-0 ring-0 focus:outline-none focus:ring-offset-0">
                <SelectValue placeholder={`${isLoadingInstances ? "Loading versions..." : "Choose a version..."}`} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingInstances ? (
                  <div className="p-4 text-center">
                    <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <p className="text-sm text-gray-500">Loading versions...</p>
                  </div>
                ) : instancesError ? (
                  <div className="p-4 text-center">
                    <IoAlertCircle className="w-5 h-5 mx-auto mb-2 text-red-500" />
                    <p className="text-sm text-red-600">
                      Failed to load versions
                    </p>
                  </div>
                ) : instances.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No versions available
                  </div>
                ) : (
                  instances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      {instance.type} ({instance.id.slice(0, 8)}...)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          {/* Text Preview */}
            {selectedText && selectedInstanceId && <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Preview 
              </label>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                <pre className={`text-sm text-gray-700 whitespace-pre-wrap font-sans ${selectedText?.language == "bo" ? "font-monlam" : "font-google-sans"}`}>
                  {isLoadingContent ? "Loading content..." : getSegmentedText()}
                </pre>
              </div>
            </div>}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loadTextMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            size="lg"
            onClick={handleLoadText}
            disabled={
              !selectedText?.id ||
              !selectedInstanceId ||
              loadTextMutation.isPending ||
              isLoadingTexts ||
              isLoadingInstances ||
              isLoadingContent
            }
          >
            {loadTextMutation.isPending ? (
              <>
                <AiOutlineLoading3Quarters className="w-4 h-4 mr-2 animate-spin" />
                Loading Text...
              </>
            ) : (
              "Load & Start Annotating"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

