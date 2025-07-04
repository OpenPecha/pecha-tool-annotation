import React, {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView, Decoration } from "@codemirror/view";
import { EditorSelection, StateField, StateEffect } from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Annotation } from "@/pages/Task";
import {
  loadAnnotationConfig,
  type AnnotationConfig,
  type AnnotationOption,
} from "@/config/annotation-options";

// Create state effects for managing annotations
const addAnnotationEffect = StateEffect.define<Annotation>();
const clearAnnotationsEffect = StateEffect.define();

// Create decoration field for annotations
const annotationField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);

    for (const effect of tr.effects) {
      if (effect.is(addAnnotationEffect)) {
        const annotation = effect.value;
        const decoration = Decoration.mark({
          class: `annotation-${annotation.type}`,
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

interface EditorProps {
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

export type EditorRef = {
  scrollToPosition: (start: number, end: number) => void;
};

interface CurrentSelection {
  text: string;
  startIndex: number;
  endIndex: number;
}

// Editor Component
export const Editor = forwardRef<EditorRef, EditorProps>(
  (
    {
      text,
      setText,
      annotations,
      onTextSelect,
      onAddAnnotation,
      onRemoveAnnotation,
      onHeaderSelected,
      readOnly = true,
    },
    ref
  ) => {
    const editorRef = useRef<{ view?: EditorView }>(null);
    const [currentSelection, setCurrentSelection] =
      useState<CurrentSelection | null>(null);
    const [bubbleMenuVisible, setBubbleMenuVisible] = useState(false);
    const [bubbleMenuPosition, setBubbleMenuPosition] = useState({
      x: 0,
      y: 0,
    });
    const [annotationText, setAnnotationText] = useState("");

    const [deletePopupVisible, setDeletePopupVisible] = useState(false);
    const [deletePopupPosition, setDeletePopupPosition] = useState({
      x: 0,
      y: 0,
    });
    const [annotationToDelete, setAnnotationToDelete] =
      useState<Annotation | null>(null);
    const [editorReady, setEditorReady] = useState(false);
    const [annotationConfig, setAnnotationConfig] =
      useState<AnnotationConfig | null>(null);

    const charlength = text?.length;

    // Load annotation configuration on component mount
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

    // Update annotations in the editor when annotations prop changes
    useEffect(() => {
      const updateAnnotations = () => {
        if (editorRef.current?.view) {
          const view = editorRef.current.view;

          // Clear existing annotations
          view.dispatch({
            effects: clearAnnotationsEffect.of(null),
          });

          // Add all current annotations
          if (annotations.length > 0) {
            console.log(annotations);

            annotations.forEach((annotation) => {
              view.dispatch({
                effects: addAnnotationEffect.of(annotation),
              });
            });
          }
        } else {
          console.log("Editor: View not ready yet");
        }
      };

      // Small delay to ensure CodeMirror is fully initialized
      const timer = setTimeout(updateAnnotations, 100);
      return () => clearTimeout(timer);
    }, [annotations]);

    // Apply annotations when editor becomes ready
    useEffect(() => {
      if (editorReady && annotations.length > 0) {
        const timer = setTimeout(() => {
          if (editorRef.current?.view) {
            const view = editorRef.current.view;
            annotations.forEach((annotation) => {
              console.log(annotation);
              view.dispatch({
                effects: addAnnotationEffect.of(annotation),
              });
            });
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [editorReady, annotations]);

    // Handle annotation deletion clicks
    useEffect(() => {
      const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const annotationElement = target.closest("[data-annotation-id]");

        // Only handle annotation clicks for deletion
        if (annotationElement) {
          const annotationId =
            annotationElement.getAttribute("data-annotation-id");
          const annotation = annotations.find((ann) => ann.id === annotationId);

          if (annotation) {
            const rect = annotationElement.getBoundingClientRect();

            // Get the editor element's position relative to the viewport
            const editorElement = annotationElement.closest(".cm-editor");
            const editorRect = editorElement?.getBoundingClientRect();

            if (editorRect) {
              // Calculate position relative to the editor element
              const popupWidth = 256; // min-w-64 = 256px
              const popupHeight = 120; // Approximate popup height
              const margin = 10; // Margin from editor edges

              let popupX = rect.left + rect.width / 2 - editorRect.left;
              let popupY = rect.bottom + 5 - editorRect.top;

              // Ensure popup stays within horizontal bounds
              const popupHalfWidth = popupWidth / 2;
              if (popupX - popupHalfWidth < margin) {
                popupX = popupHalfWidth + margin;
              } else if (popupX + popupHalfWidth > editorRect.width - margin) {
                popupX = editorRect.width - popupHalfWidth - margin;
              }

              // Ensure popup stays within vertical bounds
              if (popupY < margin) {
                popupY = margin;
              } else if (popupY + popupHeight > editorRect.height - margin) {
                popupY = editorRect.height - popupHeight - margin;
              }

              setDeletePopupPosition({
                x: popupX,
                y: popupY,
              });
              setAnnotationToDelete(annotation);
              setDeletePopupVisible(true);
              setBubbleMenuVisible(false);
            }
          }
        }
      };

      const editorElement = editorRef.current?.view?.dom;

      if (editorElement) {
        editorElement.addEventListener("click", handleClick, true);
      }

      return () => {
        if (editorElement) {
          editorElement.removeEventListener("click", handleClick, true);
        }
      };
    }, [annotations]);

    // Add keyboard event listener for closing popups
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setBubbleMenuVisible(false);
          setDeletePopupVisible(false);
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      scrollToPosition: (start: number, end: number) => {
        if (editorRef.current) {
          // Scroll to position in CodeMirror
          const view = editorRef.current.view;
          if (view) {
            view.dispatch({
              selection: { anchor: start, head: end },
              effects: EditorView.scrollIntoView(start, { y: "center" }),
            });
            view.focus();
          }
        }
      },
    }));

    const handleChange = React.useCallback(
      (val: string) => {
        setText(val);
      },
      [setText]
    );

    const handleSelection = (selection: EditorSelection) => {
      // Handle normal text selection
      handleSelectionComplete(selection);
    };

    const handleSelectionComplete = (selection: EditorSelection) => {
      if (selection && selection.ranges && selection.ranges.length > 0) {
        const range = selection.ranges[0];
        const start = range.from;
        const end = range.to;

        if (start !== end) {
          const selectedText = text.substring(start, end);

          setCurrentSelection({
            text: selectedText,
            startIndex: start,
            endIndex: end,
          });

          onTextSelect({
            text: selectedText,
            start: start,
            end: end,
          });

          // Position bubble menu
          if (editorRef.current) {
            const view = editorRef.current.view;
            if (view) {
              const startCoords = view.coordsAtPos(start);
              const endCoords = view.coordsAtPos(end);

              if (startCoords && endCoords) {
                // Get the editor element's position relative to the viewport
                const editorElement = view.dom; // This is the .cm-editor element
                const editorRect = editorElement.getBoundingClientRect();

                // Calculate positions relative to the editor element
                const selectionCenterX =
                  (startCoords.left + endCoords.right) / 2 - editorRect.left;
                const selectionBottom =
                  Math.max(startCoords.bottom, endCoords.bottom) -
                  editorRect.top;
                const selectionTop =
                  Math.min(startCoords.top, endCoords.top) - editorRect.top;

                // Get editor dimensions
                const editorWidth = editorRect.width;
                const editorHeight = editorRect.height;
                const bubbleWidth = 320; // Approximate bubble menu width
                const bubbleHeight = 200; // Approximate bubble menu height
                const margin = 10; // Margin from editor edges

                // Determine if bubble should be above or below
                const spaceBelow = editorHeight - selectionBottom;
                const spaceAbove = selectionTop;

                let bubbleY;
                if (spaceBelow >= bubbleHeight + margin) {
                  // Place below selection
                  bubbleY = selectionBottom + 10;
                } else if (spaceAbove >= bubbleHeight + margin) {
                  // Place above selection
                  bubbleY = selectionTop - bubbleHeight - 10;
                } else {
                  // Place below if more space, otherwise above
                  bubbleY =
                    spaceBelow > spaceAbove
                      ? selectionBottom + 10
                      : selectionTop - bubbleHeight - 10;
                }

                // Ensure bubble stays within vertical bounds
                if (bubbleY < margin) {
                  bubbleY = margin;
                } else if (bubbleY + bubbleHeight > editorHeight - margin) {
                  bubbleY = editorHeight - bubbleHeight - margin;
                }

                // Calculate horizontal position and ensure it stays within bounds
                let bubbleX = selectionCenterX;
                const bubbleHalfWidth = bubbleWidth / 2;

                // Check if bubble would go off the left edge
                if (bubbleX - bubbleHalfWidth < margin) {
                  bubbleX = bubbleHalfWidth + margin;
                }
                // Check if bubble would go off the right edge
                else if (bubbleX + bubbleHalfWidth > editorWidth - margin) {
                  bubbleX = editorWidth - bubbleHalfWidth - margin;
                }

                setBubbleMenuPosition({
                  x: bubbleX,
                  y: bubbleY,
                });
                setBubbleMenuVisible(true);
              }
            }
          }
        } else {
          setBubbleMenuVisible(false);
          setCurrentSelection(null);
          onTextSelect(null);
        }
      }
    };

    const addAnnotation = (type: string) => {
      if (!currentSelection) return;

      // Handle header annotations differently - show in table of contents for naming
      if (type === "header" && onHeaderSelected) {
        onHeaderSelected({
          text: currentSelection.text,
          start: currentSelection.startIndex,
          end: currentSelection.endIndex,
        });
      } else {
        // Call the parent's onAddAnnotation with the selected type
        onAddAnnotation(type);
      }

      // Reset state
      setBubbleMenuVisible(false);
      setAnnotationText("");
      setCurrentSelection(null);
    };

    const cancelAnnotation = () => {
      setBubbleMenuVisible(false);
      setAnnotationText("");
      setCurrentSelection(null);
      onTextSelect(null);
    };

    const handleDeleteAnnotation = () => {
      if (annotationToDelete) {
        onRemoveAnnotation(annotationToDelete.id);
        setDeletePopupVisible(false);
        setAnnotationToDelete(null);
      }
    };

    const cancelDelete = () => {
      setDeletePopupVisible(false);
      setAnnotationToDelete(null);
    };

    const extensions = [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      annotationField,
      EditorView.updateListener.of((update) => {
        if (update.selectionSet) {
          handleSelection(update.state.selection);
        }
      }),

      EditorView.theme({
        "&": {
          fontSize: "16px",
          lineHeight: "1.5",
          overflow: "hidden",
        },
        ".cm-content": {
          padding: "12px",
          fontFamily: "'monlam', monospace",
          whiteSpace: "pre-wrap",
          fontSize: "14px",
          minHeight: "100%",
          maxWidth: "95%",
          overflowWrap: "break-word",
          lineHeight: "2",
          wordBreak: "break-word",
        },
        ".cm-line": {
          padding: "0",
          maxWidth: "100%",
          overflowWrap: "break-word",
          wordBreak: "break-word",
        },
        ".cm-editor": {
          height: "100%",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
        },
        ".cm-scroller": {
          overflow: "hidden !important",
          height: "100%",
        },
        ".cm-focused": {
          outline: "none",
        },
        // Dynamic annotation styling based on configuration
        ...(annotationConfig?.options.reduce((styles, option) => {
          styles[`.annotation-${option.id}`] = {
            backgroundColor: option.backgroundColor,
            borderBottom: `2px solid ${option.borderColor}`,
            borderRadius: "2px",
            padding: "1px 2px",
            position: "relative",
          };
          return styles;
        }, {} as Record<string, Record<string, string>>) || {}),
        // Custom scrollbar styling
        ".cm-scroller::-webkit-scrollbar": {
          width: "12px",
          height: "12px",
        },
        ".cm-scroller::-webkit-scrollbar-track": {
          background: "#f8f9fa",
          borderRadius: "6px",
        },
        ".cm-scroller::-webkit-scrollbar-thumb": {
          background: "#6c757d",
          borderRadius: "6px",
          border: "2px solid #f8f9fa",
        },
        ".cm-scroller::-webkit-scrollbar-thumb:hover": {
          background: "#495057",
        },
        ".cm-scroller::-webkit-scrollbar-corner": {
          background: "#f8f9fa",
        },
        ".cm-activeLine": {
          backgroundColor: "transparent",
        },
        ".cm-cursor": {
          borderLeft: "2px solid #333",
          display: "block !important",
          opacity: "1 !important",
        },
        ".cm-editor.cm-readonly .cm-cursor": {
          borderLeft: "2px solid #666",
          display: "block !important",
          opacity: "1 !important",
        },
      }),
    ];

    return (
      <div className="h-[calc(100vh-70px)] overflow-y-scroll overflow-x-hidden  bg-white rounded-lg shadow-lg relative ">
        {readOnly && (
          <div className="absolute top-2 right-2 z-10">
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium border">
              Read Only
            </span>
          </div>
        )}

        <CodeMirror
          ref={editorRef}
          value={text}
          height="100%"
          extensions={extensions}
          onChange={handleChange}
          readOnly={readOnly}
          onCreateEditor={() => {
            // Set editor as ready when view is created
            setEditorReady(true);
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            allowMultipleSelections: false,
            highlightActiveLine: true,
            highlightSelectionMatches: false,
            searchKeymap: true,
          }}
        />
        <div className="text-sm text-gray-500 sticky w-max bottom-0 right-2 float-right border bg-white border-gray-200 rounded-md p-2">
          {charlength} characters
        </div>

        {/* Bubble Menu */}
        {bubbleMenuVisible && currentSelection && (
          <div
            className="absolute bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50  "
            style={{
              left: `${bubbleMenuPosition.x}px`,
              top: `${bubbleMenuPosition.y}px`,
              transform: "translateX(-50%)",
            }}
          >
            {/* Close button */}
            <Button
              onClick={cancelAnnotation}
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="mb-3 pr-8">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Selected: "
                {currentSelection.text.length > 50
                  ? currentSelection.text.substring(0, 50) + "..."
                  : currentSelection.text}
                "
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Choose annotation type:
              </p>

              <div className="flex flex-wrap gap-2 mb-3">
                {annotationConfig?.options.map((option: AnnotationOption) => (
                  <Button
                    key={option.id}
                    onClick={() => addAnnotation(option.id)}
                    size="sm"
                    className="px-4 py-2 text-white rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                    style={{
                      backgroundColor: option.borderColor,
                      color: option.color,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    {option.icon && (
                      <span className="text-xs">{option.icon}</span>
                    )}
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="Add a note (optional)..."
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    cancelAnnotation();
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Delete Annotation Popup */}
        {deletePopupVisible && annotationToDelete && (
          <div
            className="absolute bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-50 min-w-64"
            style={{
              left: `${deletePopupPosition.x}px`,
              top: `${deletePopupPosition.y}px`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">
                Delete Annotation?
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Type:{" "}
                <span className="font-medium capitalize">
                  {annotationToDelete.type}
                </span>
              </p>
              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                "
                {annotationToDelete.text.length > 50
                  ? annotationToDelete.text.substring(0, 50) + "..."
                  : annotationToDelete.text}
                "
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleDeleteAnnotation}
                size="sm"
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors duration-200"
              >
                Delete
              </Button>
              <Button
                onClick={cancelDelete}
                variant="outline"
                size="sm"
                className="px-3 py-2 text-gray-600 hover:text-gray-800 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

Editor.displayName = "Editor";
