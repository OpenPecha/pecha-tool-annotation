import { useEffect, useRef } from "react";
import type { EditorView } from "@codemirror/view";
import type { Annotation } from "@/pages/Task";
import {
  addAnnotationEffect,
  clearAnnotationsEffect,
} from "../extensions/annotationField";

export const useAnnotationEffects = (
  annotations: Annotation[],
  editorReady: boolean
) => {
  const editorRef = useRef<{ view?: EditorView }>(null);

  // Update annotations in the editor when annotations prop changes or editor becomes ready
  useEffect(() => {
    const updateAnnotations = () => {
      if (editorRef.current?.view && editorReady) {
        const view = editorRef.current.view;

        // Clear existing annotations first
        view.dispatch({
          effects: clearAnnotationsEffect.of(null),
        });

        // Add all current annotations
        if (annotations.length > 0) {
          annotations.forEach((annotation) => {
            view.dispatch({
              effects: addAnnotationEffect.of(annotation),
            });
          });
        }
      }
    };

    // Apply annotations when both editor is ready and we have the view
    if (editorReady && editorRef.current?.view) {
      updateAnnotations();
    }
  }, [annotations, editorReady]);

  return editorRef;
};
