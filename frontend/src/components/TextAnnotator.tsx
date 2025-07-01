import { useRef, useImperativeHandle, forwardRef } from "react";
import { Editor } from "./Editor";
import type { EditorRef } from "./Editor";
import type { Annotation } from "@/pages/Index";

interface TextAnnotatorProps {
  text: string;
  setText: (text: string) => void;
  annotations: Annotation[];
  selectedText: { text: string; start: number; end: number } | null;
  onTextSelect: (
    selection: { text: string; start: number; end: number } | null
  ) => void;
  onAddAnnotation: (type: "header" | "person" | "object") => void;
  onRemoveAnnotation: (id: string) => void;
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

    return (
      <Editor
        ref={editorRef}
        text={text}
        setText={setText}
        annotations={annotations}
        selectedText={selectedText}
        onTextSelect={onTextSelect}
        onAddAnnotation={onAddAnnotation}
        onRemoveAnnotation={onRemoveAnnotation}
        readOnly={readOnly}
      />
    );
  }
);

TextAnnotator.displayName = "TextAnnotator";
