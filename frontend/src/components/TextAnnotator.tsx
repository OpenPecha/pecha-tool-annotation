import { useRef, useImperativeHandle, forwardRef } from "react";
import { Editor } from "./Editor";
import type { EditorRef } from "./Editor/types";
import type { Annotation } from "@/pages/Task";
import { SearchComponent } from "./SearchComponent";

interface TextAnnotatorProps {
  text: string;
  annotations: Annotation[];
  selectedText: { text: string; start: number; end: number } | null;
  onTextSelect: (
    selection: { text: string; start: number; end: number } | null
  ) => void;
  onAddAnnotation: (type: string, name?: string, level?: string) => void;
  onRemoveAnnotation: (id: string) => void;
  onUpdateAnnotation?: (
    annotationId: string,
    newType: string,
    newText?: string
  ) => void;
  onHeaderSelected?: (selection: {
    text: string;
    start: number;
    end: number;
  }) => void;
  onUpdateHeaderSpan?: (
    headerId: string,
    newStart: number,
    newEnd: number
  ) => void;
  readOnly?: boolean;
  isCreatingAnnotation?: boolean;
  isDeletingAnnotation?: boolean;
  highlightedAnnotationId?: string | null;
}

export type TextAnnotatorRef = {
  scrollToPosition: (start: number, end: number) => void;
};

export const TextAnnotator = forwardRef<TextAnnotatorRef, TextAnnotatorProps>(
  (
    {
      text,
      annotations,
      selectedText,
      onTextSelect,
      onAddAnnotation,
      onRemoveAnnotation,
      onUpdateAnnotation,
      onHeaderSelected,
      onUpdateHeaderSpan,
      readOnly = true,
      isCreatingAnnotation = false,
      isDeletingAnnotation = false,
      highlightedAnnotationId,
    },
    ref
  ) => {
    const editorRef = useRef<EditorRef>(null);

    useImperativeHandle(ref, () => ({
      scrollToPosition: (start: number, end: number) => {
        editorRef.current?.scrollToPosition(start, end);
      },
    }));

    const handleSearchResultSelect = (start: number, end: number) => {
      editorRef.current?.scrollToPosition(start, end);
    };

    return (
      <div className="flex flex-col h-full">
        {/* Search Bar - Always visible */}
        <SearchComponent
          text={text}
          isVisible={true}
          onClose={() => {}} // No close functionality needed
          onResultSelect={handleSearchResultSelect}
        />

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            ref={editorRef}
            text={text}
            annotations={annotations}
            selectedText={selectedText}
            onTextSelect={onTextSelect}
            onAddAnnotation={onAddAnnotation}
            onRemoveAnnotation={onRemoveAnnotation}
            onUpdateAnnotation={onUpdateAnnotation}
            onHeaderSelected={onHeaderSelected}
            onUpdateHeaderSpan={onUpdateHeaderSpan}
            readOnly={readOnly}
            isCreatingAnnotation={isCreatingAnnotation}
            isDeletingAnnotation={isDeletingAnnotation}
            highlightedAnnotationId={highlightedAnnotationId}
          />
        </div>
      </div>
    );
  }
);

TextAnnotator.displayName = "TextAnnotator";
