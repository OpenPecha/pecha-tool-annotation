import { useRef, useImperativeHandle, forwardRef } from "react";
import { Editor } from "./Editor";
import type { EditorRef } from "./Editor";
import type { Annotation } from "@/pages/Task";
import { SearchComponent } from "./SearchComponent";

interface TextAnnotatorProps {
  text: string;
  setText: (text: string) => void;
  annotations: Annotation[];
  selectedText: { text: string; start: number; end: number } | null;
  onTextSelect: (
    selection: { text: string; start: number; end: number } | null
  ) => void;
  onAddAnnotation: (type: string, name?: string) => void;
  onRemoveAnnotation: (id: string) => void;
  onHeaderSelected?: (selection: {
    text: string;
    start: number;
    end: number;
  }) => void;
  readOnly?: boolean;
}

export type TextAnnotatorRef = {
  scrollToPosition: (start: number, end: number) => void;
};

export const TextAnnotator = forwardRef<TextAnnotatorRef, TextAnnotatorProps>(
  (
    {
      text,
      setText,
      annotations,
      selectedText,
      onTextSelect,
      onAddAnnotation,
      onRemoveAnnotation,
      onHeaderSelected,
      readOnly = true,
    },
    ref
  ) => {
    const editorRef = useRef<EditorRef>(null);

    useImperativeHandle(ref, () => ({
      scrollToPosition: (start: number, end: number) => {
        editorRef.current?.scrollToPosition(start, end);
      },
    }));

    // Handle search result selection
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
        <div className="flex-1">
          <Editor
            ref={editorRef}
            text={text}
            setText={setText}
            annotations={annotations}
            selectedText={selectedText}
            onTextSelect={onTextSelect}
            onAddAnnotation={onAddAnnotation}
            onRemoveAnnotation={onRemoveAnnotation}
            onHeaderSelected={onHeaderSelected}
            readOnly={readOnly}
          />
        </div>
      </div>
    );
  }
);

TextAnnotator.displayName = "TextAnnotator";
