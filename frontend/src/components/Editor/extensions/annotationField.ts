import { EditorView, Decoration } from "@codemirror/view";
import { StateField, StateEffect } from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import type { Annotation } from "@/pages/Task";

// Create state effects for managing annotations
export const addAnnotationEffect = StateEffect.define<Annotation>();
export const clearAnnotationsEffect = StateEffect.define();

// Create decoration field for annotations
export const annotationField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);

    for (const effect of tr.effects) {
      if (effect.is(addAnnotationEffect)) {
        const annotation = effect.value;
        const isOptimistic = annotation.id.startsWith("temp-");
        const decoration = Decoration.mark({
          class: `annotation-${annotation.type} ${
            isOptimistic ? "annotation-optimistic" : ""
          }`,
          attributes: {
            title: `${annotation.type}: ${annotation.text}`,
            "data-annotation-id": annotation.id,
            "data-annotation-type": annotation.type,
          },
        });
        decorations = decorations.update({
          add: [decoration.range(annotation.start, annotation.end)],
        });
      } else if (effect.is(clearAnnotationsEffect)) {
        decorations = Decoration.none;
      }
    }

    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});
