import { EditorView, Decoration, WidgetType } from "@codemirror/view";
import { StateField, StateEffect } from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import type { Annotation } from "@/pages/Task";

// Widget class for annotation labels
class AnnotationLabelWidget extends WidgetType {
  annotation: Annotation;
  titleText: string;
  isOptimistic: boolean;

  constructor(
    annotation: Annotation,
    titleText: string,
    isOptimistic: boolean
  ) {
    super();
    this.annotation = annotation;
    this.titleText = titleText;
    this.isOptimistic = isOptimistic;
  }

  toDOM() {
    const label = document.createElement("div");
    label.className = `annotation-label annotation-label-${
      this.annotation.type
    } ${this.isOptimistic ? "annotation-label-optimistic" : ""}`;
    label.textContent = this.titleText;
    label.setAttribute("data-annotation-id", this.annotation.id);
    label.setAttribute("data-annotation-type", this.annotation.type);

    // Add click handler for annotation selection/deletion
    label.addEventListener("click", (e) => {
      e.stopPropagation();
      // Dispatch custom event for annotation interaction
      const customEvent = new CustomEvent("annotation-label-click", {
        detail: { annotation: this.annotation },
        bubbles: true,
      });
      label.dispatchEvent(customEvent);
    });

    return label;
  }

  eq(other: AnnotationLabelWidget) {
    return (
      this.annotation.id === other.annotation.id &&
      this.titleText === other.titleText &&
      this.isOptimistic === other.isOptimistic
    );
  }
}

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

    // Batch all decoration additions to ensure proper sorting
    const toAdd: Array<{ from: number; to: number; decoration: Decoration }> =
      [];

    for (const effect of tr.effects) {
      if (effect.is(addAnnotationEffect)) {
        const annotation = effect.value;
        const isOptimistic = annotation.id.startsWith("temp-");
        const titleText =
          typeof annotation.name === "string" && annotation.name.trim()
            ? annotation.name
            : annotation.type;

        // Create mark decoration for highlighting the text
        const markDecoration = Decoration.mark({
          class: `annotation-${annotation.type} ${
            isOptimistic ? "annotation-optimistic" : ""
          }`,
          attributes: {
            title: titleText,
            "data-annotation-id": annotation.id,
            "data-annotation-type": annotation.type,
          },
        });

        // Create widget decoration for the label at the start position
        const labelWidget = new AnnotationLabelWidget(
          annotation,
          titleText,
          isOptimistic
        );
        const labelDecoration = Decoration.widget({
          widget: labelWidget,
          side: -1, // Place before the position
          block: false,
        });

        // Add to batch - widget first, then mark
        toAdd.push({
          from: annotation.start,
          to: annotation.start,
          decoration: labelDecoration,
        });
        toAdd.push({
          from: annotation.start,
          to: annotation.end,
          decoration: markDecoration,
        });
      } else if (effect.is(clearAnnotationsEffect)) {
        decorations = Decoration.none;
      }
    }

    // Sort all decorations by position and side, then add them
    if (toAdd.length > 0) {
      const sortedRanges = toAdd
        .sort((a, b) => {
          // Sort by 'from' position first
          if (a.from !== b.from) {
            return a.from - b.from;
          }
          // For same position, sort by side (widget side comes first)
          const aSide = a.decoration.spec?.side ?? 0;
          const bSide = b.decoration.spec?.side ?? 0;
          return aSide - bSide;
        })
        .map((item) => item.decoration.range(item.from, item.to));

      decorations = decorations.update({
        add: sortedRanges,
      });
    }

    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});
