import React, {
  useImperativeHandle,
  forwardRef,
  useEffect,
  useCallback,
  useRef,
} from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { BubbleMenu } from "./components/BubbleMenu";
import { DeletePopup } from "./components/DeletePopup";
import { useEditorState } from "./hooks/useEditorState";
import { useAnnotationEffects } from "./hooks/useAnnotationEffects";
import {
  annotationField,
  addAnnotationEffect,
  clearAnnotationsEffect,
} from "./extensions/annotationField";
import { loadAnnotationConfig } from "@/config/annotation-options";
import type { EditorProps, EditorRef } from "./types";

export const Editor = forwardRef<EditorRef, EditorProps>(
  (
    {
      text,
      annotations,
      onTextSelect,
      onAddAnnotation,
      onRemoveAnnotation,
      onHeaderSelected,
      onUpdateHeaderSpan,
      readOnly = true,
      isCreatingAnnotation = false,
      isDeletingAnnotation = false,
    },
    ref
  ) => {
    // Use ref for text to avoid re-renders since text never changes
    const textRef = useRef(text);
    textRef.current = text;

    const {
      currentSelection,
      bubbleMenuVisible,
      bubbleMenuPosition,
      annotationText,
      selectedHeaderId,
      deletePopupVisible,
      deletePopupPosition,
      annotationToDelete,
      editorReady,
      setCurrentSelection,
      setBubbleMenuVisible,
      setBubbleMenuPosition,
      setAnnotationText,
      setSelectedHeaderId,
      setDeletePopupVisible,
      setDeletePopupPosition,
      setAnnotationToDelete,
      setEditorReady,
      resetBubbleMenu,
      resetDeletePopup,
    } = useEditorState();

    const editorRef = useAnnotationEffects(annotations, editorReady);

    useImperativeHandle(ref, () => ({
      scrollToPosition: (start: number, end: number) => {
        if (editorRef.current) {
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

    // Handle annotation deletion clicks and outside clicks
    useEffect(() => {
      const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const annotationElement = target.closest("[data-annotation-id]");
        const deletePopupElement = target.closest(".delete-popup");

        // Close delete popup if clicking outside of it and not on an annotation
        if (deletePopupVisible && !deletePopupElement && !annotationElement) {
          resetDeletePopup();
          return;
        }

        // Only handle annotation clicks for deletion
        if (annotationElement) {
          const annotationId =
            annotationElement.getAttribute("data-annotation-id");
          const annotation = annotations.find((ann) => ann.id === annotationId);

          if (annotation) {
            // Check if there's currently a multi-character selection
            let hasMultiCharSelection = false;
            if (currentSelection && currentSelection.text.length > 1) {
              hasMultiCharSelection = true;
            }

            // Only show delete popup if there's no multi-character selection
            if (!hasMultiCharSelection) {
              const rect = annotationElement.getBoundingClientRect();
              const editorElement = annotationElement.closest(".cm-editor");
              const editorRect = editorElement?.getBoundingClientRect();

              if (editorRect) {
                const popupWidth = 256;
                const popupHeight = 120;
                const margin = 10;

                let popupX = rect.left + rect.width / 2 - editorRect.left;
                let popupY = rect.bottom + 5 - editorRect.top;

                // Ensure popup stays within bounds
                const popupHalfWidth = popupWidth / 2;
                if (popupX - popupHalfWidth < margin) {
                  popupX = popupHalfWidth + margin;
                } else if (
                  popupX + popupHalfWidth >
                  editorRect.width - margin
                ) {
                  popupX = editorRect.width - popupHalfWidth - margin;
                }

                if (popupY < margin) {
                  popupY = margin;
                } else if (popupY + popupHeight > editorRect.height - margin) {
                  popupY = editorRect.height - popupHeight - margin;
                }

                setDeletePopupPosition({ x: popupX, y: popupY });
                setAnnotationToDelete(annotation);
                setDeletePopupVisible(true);
                setBubbleMenuVisible(false);
              }
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
    }, [
      annotations,
      deletePopupVisible,
      currentSelection,
      resetDeletePopup,
      setBubbleMenuVisible,
      setDeletePopupPosition,
      setAnnotationToDelete,
      setDeletePopupVisible,
    ]);

    // Add keyboard event listener for closing popups
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          resetBubbleMenu();
          resetDeletePopup();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [resetBubbleMenu, resetDeletePopup]);

    const handleSelectionComplete = useCallback(
      (selection: EditorSelection) => {
        // Close delete popup when selection changes
        if (deletePopupVisible) {
          resetDeletePopup();
        }

        if (selection?.ranges?.length > 0) {
          const range = selection.ranges[0];
          const start = range.from;
          const end = range.to;

          if (start !== end) {
            const selectedText = textRef.current.substring(start, end);
            const newCurrentSelection = {
              text: selectedText,
              startIndex: start,
              endIndex: end,
            };

            setCurrentSelection(newCurrentSelection);
            onTextSelect({ text: selectedText, start, end });

            // Position bubble menu
            if (editorRef.current?.view) {
              const view = editorRef.current.view;
              const startCoords = view.coordsAtPos(start);
              const endCoords = view.coordsAtPos(end);

              if (startCoords && endCoords) {
                const editorElement = view.dom;
                const editorRect = editorElement.getBoundingClientRect();

                const selectionCenterX =
                  (startCoords.left + endCoords.right) / 2 - editorRect.left;
                const selectionBottom =
                  Math.max(startCoords.bottom, endCoords.bottom) -
                  editorRect.top;
                const selectionTop =
                  Math.min(startCoords.top, endCoords.top) - editorRect.top;

                const editorWidth = editorRect.width;
                const editorHeight = editorRect.height;
                const bubbleWidth = 380;
                const bubbleHeight = 250;
                const margin = 10;

                // Determine positioning
                const spaceBelow = editorHeight - selectionBottom;
                const spaceAbove = selectionTop;

                let bubbleY =
                  spaceBelow >= bubbleHeight + margin
                    ? selectionBottom + 10
                    : spaceAbove >= bubbleHeight + margin
                    ? selectionTop - bubbleHeight - 10
                    : spaceBelow > spaceAbove
                    ? selectionBottom + 10
                    : selectionTop - bubbleHeight - 10;

                // Ensure bounds
                if (bubbleY < margin) bubbleY = margin;
                else if (bubbleY + bubbleHeight > editorHeight - margin) {
                  bubbleY = editorHeight - bubbleHeight - margin;
                }

                // Horizontal positioning
                let bubbleX = selectionCenterX;
                const bubbleTransformX = "-50%";
                const bubbleHalfWidth = bubbleWidth / 2;

                if (bubbleX - bubbleHalfWidth < margin) {
                  bubbleX = bubbleHalfWidth + margin;
                } else if (bubbleX + bubbleHalfWidth > editorWidth - margin) {
                  bubbleX = editorWidth - bubbleHalfWidth - margin;
                }

                setBubbleMenuPosition({
                  x: bubbleX,
                  y: bubbleY,
                  transformX: bubbleTransformX,
                });
                setBubbleMenuVisible(true);
              }
            }
          } else {
            resetBubbleMenu();
            onTextSelect(null);
            if (deletePopupVisible) {
              resetDeletePopup();
            }
          }
        }
      },
      [
        deletePopupVisible,
        onTextSelect,
        resetBubbleMenu,
        resetDeletePopup,
        setCurrentSelection,
        setBubbleMenuPosition,
        setBubbleMenuVisible,
      ]
    );

    const handleAddAnnotation = useCallback(
      (type: string) => {
        if (!currentSelection) return;

        if (type === "header" && onHeaderSelected) {
          onHeaderSelected({
            text: currentSelection.text,
            start: currentSelection.startIndex,
            end: currentSelection.endIndex,
          });
        } else {
          onAddAnnotation(type);
        }

        resetBubbleMenu();
        onTextSelect(null);
      },
      [
        currentSelection,
        onHeaderSelected,
        onAddAnnotation,
        resetBubbleMenu,
        onTextSelect,
      ]
    );

    const handleUpdateHeaderSpan = useCallback(() => {
      if (!currentSelection || !selectedHeaderId || !onUpdateHeaderSpan) return;

      onUpdateHeaderSpan(
        selectedHeaderId,
        currentSelection.startIndex,
        currentSelection.endIndex
      );

      resetBubbleMenu();
      onTextSelect(null);
    }, [
      currentSelection,
      selectedHeaderId,
      onUpdateHeaderSpan,
      resetBubbleMenu,
      onTextSelect,
    ]);

    const handleDeleteAnnotation = useCallback(() => {
      if (annotationToDelete) {
        onRemoveAnnotation(annotationToDelete.id);
        resetDeletePopup();
      }
    }, [annotationToDelete, onRemoveAnnotation, resetDeletePopup]);

    const extensions = [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      annotationField,
      EditorView.updateListener.of((update) => {
        if (update.selectionSet) {
          handleSelectionComplete(update.state.selection);
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
      }),
    ];

    // Apply dynamic annotation styling
    useEffect(() => {
      const applyAnnotationStyles = async () => {
        try {
          const annotationConfig = await loadAnnotationConfig();
          const style = document.createElement("style");
          const baseStyles = annotationConfig.options
            .map(
              (option) =>
                `.annotation-${option.id} { 
              background-color: ${option.backgroundColor}; 
              border-bottom: 2px solid ${option.borderColor}; 
              border-radius: 2px; 
              padding: 1px 2px; 
              position: relative; 
              transition: all 0.3s ease;
            }`
            )
            .join("\n");

          const optimisticStyles = `
            .annotation-optimistic {
              animation: annotationFlash 0.6s ease-out;
              opacity: 0.8;
            }
            
            @keyframes annotationFlash {
              0% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
              }
              50% {
                transform: scale(1.05);
                box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
              }
              100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
              }
            }
          `;

          style.textContent = baseStyles + optimisticStyles;
          document.head.appendChild(style);

          return () => {
            document.head.removeChild(style);
          };
        } catch (error) {
          console.error("Failed to apply annotation styles:", error);
        }
      };

      applyAnnotationStyles();
    }, []);

    return (
      <div className="h-[calc(100vh-140px)] min-h-[200px] overflow-y-scroll overflow-x-auto bg-white rounded-lg shadow-lg relative">
        <CodeMirror
          key={`editor-${annotations.length}`}
          ref={editorRef}
          value={textRef.current}
          height="100%"
          extensions={extensions}
          readOnly={readOnly}
          onCreateEditor={(view) => {
            setEditorReady(true);
            setTimeout(() => {
              if (annotations.length > 0) {
                view.dispatch({
                  effects: clearAnnotationsEffect.of(null),
                });
                annotations.forEach((annotation) => {
                  view.dispatch({
                    effects: addAnnotationEffect.of(annotation),
                  });
                });
              }
            }, 50);
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
          {textRef.current?.length || 0} characters
        </div>

        <BubbleMenu
          visible={bubbleMenuVisible}
          position={bubbleMenuPosition}
          currentSelection={currentSelection}
          annotationText={annotationText}
          selectedHeaderId={selectedHeaderId}
          annotations={annotations}
          isCreatingAnnotation={isCreatingAnnotation}
          onAddAnnotation={handleAddAnnotation}
          onCancel={resetBubbleMenu}
          onAnnotationTextChange={setAnnotationText}
          onSelectedHeaderIdChange={setSelectedHeaderId}
          onUpdateHeaderSpan={handleUpdateHeaderSpan}
        />

        <DeletePopup
          visible={deletePopupVisible}
          position={deletePopupPosition}
          annotation={annotationToDelete}
          isDeletingAnnotation={isDeletingAnnotation}
          onDelete={handleDeleteAnnotation}
          onCancel={resetDeletePopup}
        />
      </div>
    );
  }
);

Editor.displayName = "Editor";
