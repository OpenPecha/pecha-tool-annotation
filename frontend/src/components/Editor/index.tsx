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
import { EditorView, keymap } from "@codemirror/view";
import { EditorSelection, EditorState, Prec } from "@codemirror/state";
import { BubbleMenu } from "./components/BubbleMenu";
import { DeletePopup } from "./components/DeletePopup";
import { EditPopup } from "./components/EditPopup";
import { useEditorState } from "./hooks/useEditorState";
import { useAnnotationEffects } from "./hooks/useAnnotationEffects";
import {
  annotationField,
  addAnnotationEffect,
  setHighlightedAnnotationEffect,
} from "./extensions/annotationField";
import type { EditorProps, EditorRef } from "./types";

const POPUP_MARGIN = 10;
const POPUP_MIN_HEIGHT = 120;
const BUBBLE_SPACING = 20;
const CLICK_POPUP_SPACING = 5;

/**
 * Vertical placement for a popup anchored to [anchorTop, anchorBottom]
 * (viewport coordinates - e.g. a text selection or a clicked annotation
 * span): pins the popup to whichever side (below/above the anchor) has more
 * room and shrinks it to fit that space, rather than ever repositioning it
 * across to the other side. That means it can never end up covering the
 * selection/annotation it's anchored to, and never renders outside the
 * viewport - the popup's own CSS max-height/overflow-y is what makes the
 * "shrink to fit" half of that true; this only decides how much room it gets.
 */
const computeVerticalPlacement = (
  anchorTop: number,
  anchorBottom: number,
  spacing: number
) => {
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - anchorBottom;
  const spaceAbove = anchorTop;

  if (spaceBelow >= spaceAbove) {
    const y = anchorBottom + spacing;
    return { y, maxHeight: Math.max(POPUP_MIN_HEIGHT, viewportHeight - y - POPUP_MARGIN) };
  }
  const y = POPUP_MARGIN;
  return { y, maxHeight: Math.max(POPUP_MIN_HEIGHT, anchorTop - spacing - POPUP_MARGIN) };
};

/** Horizontal placement, centered on `centerX`, clamped within the viewport. */
const computeHorizontalPlacement = (centerX: number, popupWidth: number) => {
  const viewportWidth = window.innerWidth;
  const popupHalfWidth = popupWidth / 2;
  let x = centerX;
  if (x - popupHalfWidth < POPUP_MARGIN) {
    x = popupHalfWidth + POPUP_MARGIN;
  } else if (x + popupHalfWidth > viewportWidth - POPUP_MARGIN) {
    x = viewportWidth - popupHalfWidth - POPUP_MARGIN;
  }
  return x;
};

/** Position a click-anchored popup (EditPopup/DeletePopup) near `rect` - see computeVerticalPlacement. */
const computeClickPopupPosition = (rect: DOMRect, popupWidth: number) => {
  const x = computeHorizontalPlacement(rect.left + rect.width / 2, popupWidth);
  const { y, maxHeight } = computeVerticalPlacement(
    rect.top,
    rect.bottom,
    CLICK_POPUP_SPACING
  );
  return { x, y, maxHeight };
};

export const Editor = forwardRef<EditorRef, EditorProps>(
  (
    {
      text,
      annotations,
      onTextSelect,
      onAddAnnotation,
      onRemoveAnnotation,
      onUpdateAnnotation,
      onHeaderSelected,
      onUpdateHeaderSpan,
      readOnly = true,
      isCreatingAnnotation = false,
      isDeletingAnnotation = false,
      isUpdatingAnnotation = false,
      highlightedAnnotationId,
      hideScrollbar = false,
    },
    ref
  ) => {
    // Use ref for text to avoid re-renders since text never changes
    const textRef = useRef(text);
    textRef.current = text;

    // Track scroll position to preserve it during updates
    const scrollPositionRef = useRef<{ scrollTop: number; scrollLeft: number }>(
      { scrollTop: 0, scrollLeft: 0 }
    );

    const {
      currentSelection,
      bubbleMenuVisible,
      bubbleMenuPosition,
      annotationText,
      annotationLevel,
      selectedHeaderId,
      deletePopupVisible,
      deletePopupPosition,
      annotationToDelete,
      editPopupVisible,
      editPopupPosition,
      annotationToEdit,
      editorReady,
      setCurrentSelection,
      setBubbleMenuVisible,
      setBubbleMenuPosition,
      setAnnotationText,
      setAnnotationLevel,
      setSelectedHeaderId,
      setDeletePopupVisible,
      setDeletePopupPosition,
      setAnnotationToDelete,
      setEditPopupVisible,
      setEditPopupPosition,
      setAnnotationToEdit,
      setEditorReady,
      resetBubbleMenu,
      resetDeletePopup,
      resetEditPopup,
    } = useEditorState();

    // Track initial scroll position for modals
    const initialScrollPositionRef = useRef<{ top: number; left: number }>({
      top: 0,
      left: 0,
    });
    // anchorTop/anchorBottom are the selection/element's viewport-relative
    // bounds at the moment the popup opened - scrolling shifts them by the
    // same delta as the popup, so re-running computeVerticalPlacement with
    // the shifted bounds keeps the "never overlap the anchor" guarantee as
    // the user scrolls, instead of just translating a fixed y by the delta.
    const initialBubblePositionRef = useRef<{
      x: number;
      anchorTop: number;
      anchorBottom: number;
    } | null>(null);
    const initialEditPopupPositionRef = useRef<{
      x: number;
      anchorTop: number;
      anchorBottom: number;
    } | null>(null);

    const editorRef = useAnnotationEffects(annotations, editorReady);

    // Latest props for the CodeMirror keymap handlers below - the extensions
    // array is rebuilt every render, but refs keep the handlers safe even if
    // CodeMirror holds on to an older configuration for a tick.
    const annotationsRef = useRef(annotations);
    annotationsRef.current = annotations;
    const readOnlyRef = useRef(readOnly);
    readOnlyRef.current = readOnly;
    const onAddAnnotationRef = useRef(onAddAnnotation);
    onAddAnnotationRef.current = onAddAnnotation;
    const onRemoveAnnotationRef = useRef(onRemoveAnnotation);
    onRemoveAnnotationRef.current = onRemoveAnnotation;
    const isCreatingAnnotationRef = useRef(isCreatingAnnotation);
    isCreatingAnnotationRef.current = isCreatingAnnotation;

    /**
     * Line/page-break markers are keyboard-driven instead of popup-driven:
     * Enter inserts a line-break annotation at the cursor, Shift+Enter a
     * page-break, Backspace/Delete removes the marker sitting at the cursor.
     * The handlers always consume the key (return true) so the underlying
     * document text - which this tool never edits - can't be modified.
     */
    const insertBreakMarker = useCallback(
      (view: EditorView, type: "line-break" | "page-break") => {
        if (readOnlyRef.current) return true;
        const range = view.state.selection.main;
        // Only a bare cursor marks a break position; with a text selection
        // Enter is just swallowed so it can't replace the selection.
        if (!range.empty) return true;
        if (isCreatingAnnotationRef.current) return true;
        const pos = range.head;
        const alreadyThere = annotationsRef.current.some(
          (ann) => ann.type === type && ann.start === pos && ann.end === pos
        );
        if (!alreadyThere) {
          // The parent's selected-text state already tracks the cursor
          // (every selection change flows through onTextSelect), so the add
          // handler creates the marker at the current cursor position.
          onAddAnnotationRef.current(type);
        }
        return true;
      },
      []
    );

    const deleteBreakMarker = useCallback((view: EditorView) => {
      if (readOnlyRef.current) return true;
      const range = view.state.selection.main;
      if (range.empty) {
        const pos = range.head;
        const marker = annotationsRef.current.find(
          (ann) =>
            (ann.type === "line-break" || ann.type === "page-break") &&
            ann.start === pos &&
            ann.end === pos
        );
        // Agreed (locked) markers are rejected downstream with a toast.
        if (marker) onRemoveAnnotationRef.current(marker.id);
      }
      return true;
    }, []);

    // Function to save current scroll position
    const saveScrollPosition = useCallback(() => {
      if (editorRef.current?.view) {
        const scrollElement = editorRef.current.view.scrollDOM;
        scrollPositionRef.current = {
          scrollTop: scrollElement.scrollTop,
          scrollLeft: scrollElement.scrollLeft,
        };
      }
    }, []);

    // Function to restore scroll position
    const restoreScrollPosition = useCallback(() => {
      if (editorRef.current?.view) {
        const scrollElement = editorRef.current.view.scrollDOM;
        requestAnimationFrame(() => {
          scrollElement.scrollTop = scrollPositionRef.current.scrollTop;
          scrollElement.scrollLeft = scrollPositionRef.current.scrollLeft;
        });
      }
    }, []);

    useImperativeHandle(ref, () => ({
      scrollToPosition: (start: number, end: number, options?: { select?: boolean }) => {
        if (editorRef.current) {
          const view = editorRef.current.view;
          if (view) {
            const select = options?.select !== false;
            if (select) {
              view.dispatch({
                selection: { anchor: start, head: end },
                effects: EditorView.scrollIntoView(start, { y: "center" }),
              });
              view.focus();
            } else {
              view.dispatch({
                effects: EditorView.scrollIntoView(start, { y: "center" }),
              });
            }
          }
        }
      },
    }));

    // Handle annotation label clicks
    useEffect(() => {
      const handleAnnotationLabelClick = (event: CustomEvent) => {
        const annotation = event.detail.annotation;
        if (annotation) {
          // Don't show delete popup for agreed annotations
          if (annotation.is_agreed) {
            return;
          }
          // View-only users cannot edit or delete existing annotations.
          if (readOnly) {
            return;
          }

          // Handle annotation label click (same as clicking on annotation mark)
          {
            const popupWidth = 450;

            // Position popup near the label click using viewport coordinates
            const rect = (event.target as HTMLElement).getBoundingClientRect();
            const { x: popupX, y: popupY, maxHeight } = computeClickPopupPosition(
              rect,
              popupWidth
            );

            // Store initial scroll position and edit popup position
            const scrollElement = editorRef.current?.view?.scrollDOM;
            if (scrollElement) {
              initialScrollPositionRef.current = {
                top: scrollElement.scrollTop,
                left: scrollElement.scrollLeft,
              };
              initialEditPopupPositionRef.current = {
                x: popupX,
                anchorTop: rect.top,
                anchorBottom: rect.bottom,
              };
            }

            setEditPopupPosition({ x: popupX, y: popupY, maxHeight });
            setAnnotationToEdit(annotation);
            setEditPopupVisible(true);
            setBubbleMenuVisible(false);
          }
        }
      };

      const editorElement = editorRef.current?.view?.dom;
      if (editorElement) {
        editorElement.addEventListener(
          "annotation-label-click",
          handleAnnotationLabelClick as EventListener
        );
      }

      return () => {
        if (editorElement) {
          editorElement.removeEventListener(
            "annotation-label-click",
            handleAnnotationLabelClick as EventListener
          );
        }
      };
    }, [
      readOnly,
      setDeletePopupPosition,
      setAnnotationToDelete,
      setDeletePopupVisible,
      setBubbleMenuVisible,
    ]);

    // Handle annotation deletion clicks and outside clicks
    useEffect(() => {
      const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const annotationElement = target.closest("[data-annotation-id]");
        const deletePopupElement = target.closest(".delete-popup");

        // Close popups if clicking outside of them and not on an annotation
        const editPopupElement = target.closest(".edit-popup");
        if (deletePopupVisible && !deletePopupElement && !annotationElement) {
          resetDeletePopup();
          return;
        }
        if (editPopupVisible && !editPopupElement && !annotationElement) {
          resetEditPopup();
          return;
        }

        // Only handle annotation clicks for deletion
        if (annotationElement) {
          const annotationId =
            annotationElement.getAttribute("data-annotation-id");
          const annotation = annotations.find((ann) => ann.id === annotationId);

          if (annotation) {
            // Don't show delete popup for agreed annotations
            if (annotation.is_agreed) {
              return;
            }
            // View-only users cannot edit or delete existing annotations.
            if (readOnly) {
              return;
            }

            // Check if there's currently a multi-character selection
            let hasMultiCharSelection = false;
            if (currentSelection && currentSelection.text.length > 1) {
              hasMultiCharSelection = true;
            }

            // Only show delete popup if there's no multi-character selection
            if (!hasMultiCharSelection) {
              const rect = annotationElement.getBoundingClientRect();
              {
                const popupWidth = 450;

                const { x: popupX, y: popupY, maxHeight } = computeClickPopupPosition(
                  rect,
                  popupWidth
                );

                // Store initial scroll position and edit popup position
                const scrollElement = editorRef.current?.view?.scrollDOM;
                if (scrollElement) {
                  initialScrollPositionRef.current = {
                    top: scrollElement.scrollTop,
                    left: scrollElement.scrollLeft,
                  };
                  initialEditPopupPositionRef.current = {
                    x: popupX,
                    anchorTop: rect.top,
                    anchorBottom: rect.bottom,
                  };
                }

                setEditPopupPosition({ x: popupX, y: popupY, maxHeight });
                setAnnotationToEdit(annotation);
                setEditPopupVisible(true);
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
      readOnly,
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

    // Add scroll event listener to update modal positions
    useEffect(() => {
      const handleScroll = () => {
        if (!editorRef.current?.view) return;

        const scrollElement = editorRef.current.view.scrollDOM;
        const currentScrollTop = scrollElement.scrollTop;
        const currentScrollLeft = scrollElement.scrollLeft;

        const scrollDeltaY =
          currentScrollTop - initialScrollPositionRef.current.top;
        const scrollDeltaX =
          currentScrollLeft - initialScrollPositionRef.current.left;

        // Update bubble menu position if visible - recompute (not just
        // translate) so it keeps shrinking/growing to fit as the anchor's
        // position relative to the viewport edges changes with scroll,
        // instead of dragging a stale maxHeight along with it.
        if (bubbleMenuVisible && initialBubblePositionRef.current) {
          const { x, anchorTop, anchorBottom } = initialBubblePositionRef.current;
          const { y, maxHeight } = computeVerticalPlacement(
            anchorTop - scrollDeltaY,
            anchorBottom - scrollDeltaY,
            BUBBLE_SPACING
          );
          setBubbleMenuPosition({
            x: x - scrollDeltaX,
            y,
            maxHeight,
            transformX: "-50%",
          });
        }

        // Update edit popup position if visible (same reasoning as above)
        if (editPopupVisible && initialEditPopupPositionRef.current) {
          const { x, anchorTop, anchorBottom } = initialEditPopupPositionRef.current;
          const { y, maxHeight } = computeVerticalPlacement(
            anchorTop - scrollDeltaY,
            anchorBottom - scrollDeltaY,
            CLICK_POPUP_SPACING
          );
          setEditPopupPosition({ x: x - scrollDeltaX, y, maxHeight });
        }
      };

      const editorElement = editorRef.current?.view?.scrollDOM;
      if (editorElement) {
        editorElement.addEventListener("scroll", handleScroll);
        return () => {
          editorElement.removeEventListener("scroll", handleScroll);
        };
      }
    }, [
      bubbleMenuVisible,
      editPopupVisible,
      setBubbleMenuPosition,
      setEditPopupPosition,
    ]);

    // Clear position refs when modals are closed
    useEffect(() => {
      if (!bubbleMenuVisible) {
        initialBubblePositionRef.current = null;
      }
    }, [bubbleMenuVisible]);

    useEffect(() => {
      if (!editPopupVisible) {
        initialEditPopupPositionRef.current = null;
      }
    }, [editPopupVisible]);

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

          const isCursorPosition = start === end;
          const selectedText = isCursorPosition
            ? ""
            : textRef.current.substring(start, end);
          const newCurrentSelection = {
            text: selectedText,
            startIndex: start,
            endIndex: end,
          };

          setCurrentSelection(newCurrentSelection);
          onTextSelect({ text: selectedText, start, end });

          // View-only users may select text to read and copy, but must not be
          // offered the annotation menu.
          if (readOnly) return;

          // A bare cursor click no longer opens the annotation popup - line
          // and page break markers are managed from the keyboard instead
          // (Enter / Shift+Enter to add, Backspace/Delete to remove). Just
          // close a popup left over from an earlier text selection.
          if (isCursorPosition) {
            if (bubbleMenuVisible) setBubbleMenuVisible(false);
            return;
          }

          // Position and show bubble menu for a text selection
          if (editorRef.current?.view) {
            const view = editorRef.current.view;
            const startCoords = view.coordsAtPos(start);
            const endCoords = view.coordsAtPos(end);

            if (startCoords && endCoords) {
              const selectionCenterX = isCursorPosition
                ? startCoords.left
                : (startCoords.left + endCoords.right) / 2;
              const selectionBottom = Math.max(
                startCoords.bottom,
                endCoords.bottom
              );
              const selectionTop = Math.min(startCoords.top, endCoords.top);

              const bubbleWidth = 380;

              const bubbleX = computeHorizontalPlacement(
                selectionCenterX,
                bubbleWidth
              );
              const { y: bubbleY, maxHeight: bubbleMaxHeight } =
                computeVerticalPlacement(
                  selectionTop,
                  selectionBottom,
                  BUBBLE_SPACING
                );

              const scrollElement = editorRef.current.view.scrollDOM;
              initialScrollPositionRef.current = {
                top: scrollElement.scrollTop,
                left: scrollElement.scrollLeft,
              };
              initialBubblePositionRef.current = {
                x: bubbleX,
                anchorTop: selectionTop,
                anchorBottom: selectionBottom,
              };

              setBubbleMenuPosition({
                x: bubbleX,
                y: bubbleY,
                maxHeight: bubbleMaxHeight,
                transformX: "-50%",
              });
              setBubbleMenuVisible(true);
            }
          }
        } else {
          // Only close bubble when selection is cleared; if bubble is visible, user may be clicking inside it
          if (!bubbleMenuVisible) {
            resetBubbleMenu();
            onTextSelect(null);
          }
          if (deletePopupVisible) {
            resetDeletePopup();
          }
        }
      },
      [
        bubbleMenuVisible,
        deletePopupVisible,
        onTextSelect,
        readOnly,
        resetBubbleMenu,
        resetDeletePopup,
        setCurrentSelection,
        setBubbleMenuPosition,
        setBubbleMenuVisible,
      ]
    );

    const handleAddAnnotation = useCallback(
      (type: string, name?: string, level?: string) => {
        if (!currentSelection) return;

        // Save scroll position before adding annotation
        saveScrollPosition();

        if (type === "header" && onHeaderSelected) {
          onHeaderSelected({
            text: currentSelection.text,
            start: currentSelection.startIndex,
            end: currentSelection.endIndex,
          });
        } else {
          onAddAnnotation(
            type,
            name || annotationText || undefined,
            level || annotationLevel || undefined
          );
        }

        resetBubbleMenu();
        onTextSelect(null);

        // Restore scroll position after a short delay to allow DOM updates
        setTimeout(() => {
          restoreScrollPosition();
        }, 50);
      },
      [
        currentSelection,
        onHeaderSelected,
        onAddAnnotation,
        annotationText,
        annotationLevel,
        resetBubbleMenu,
        onTextSelect,
        saveScrollPosition,
        restoreScrollPosition,
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
        // Save scroll position before deletion
        saveScrollPosition();

        onRemoveAnnotation(annotationToDelete.id);
        resetDeletePopup();

        // Restore scroll position after deletion
        setTimeout(() => {
          restoreScrollPosition();
        }, 50);
      }
    }, [
      annotationToDelete,
      onRemoveAnnotation,
      resetDeletePopup,
      saveScrollPosition,
      restoreScrollPosition,
    ]);

    const handleUpdateAnnotation = useCallback(
      (
        annotationId: string,
        newLabel: string,
        newText?: string,
        newLevel?: string,
        newAnnotationType?: string
      ) => {
        if (onUpdateAnnotation) {
          // Use the passed update function if available
          onUpdateAnnotation(
            annotationId,
            newLabel,
            newText,
            newLevel,
            newAnnotationType
          );
        } else {
          // Fallback to remove and add if no update function provided
          // Save scroll position before update
          saveScrollPosition();

          // Find the annotation to update
          const annotation = annotations.find((ann) => ann.id === annotationId);
          if (annotation) {
            // Remove the old annotation and add the updated one
            onRemoveAnnotation(annotationId);
            // Add new annotation with same position but new type/label/level
            onAddAnnotation(
              newAnnotationType || annotation.type,
              newText || newLabel,
              newLevel
            );
          }

          // Restore scroll position after update
          setTimeout(() => {
            restoreScrollPosition();
          }, 50);
        }

        resetEditPopup();
      },
      [
        annotations,
        onRemoveAnnotation,
        onAddAnnotation,
        onUpdateAnnotation,
        resetEditPopup,
        saveScrollPosition,
        restoreScrollPosition,
      ]
    );

    const handleDeleteFromEdit = useCallback(() => {
      if (annotationToEdit) {
        // Save scroll position before deletion
        saveScrollPosition();

        onRemoveAnnotation(annotationToEdit.id);
        resetEditPopup();

        // Restore scroll position after deletion
        setTimeout(() => {
          restoreScrollPosition();
        }, 50);
      }
    }, [
      annotationToEdit,
      onRemoveAnnotation,
      resetEditPopup,
      saveScrollPosition,
      restoreScrollPosition,
    ]);

    const extensions = [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      annotationField,
      // Keyboard editing of position markers; highest precedence so the
      // default Enter/Backspace/Delete text-editing commands never run.
      Prec.highest(
        keymap.of([
          { key: "Enter", run: (view) => insertBreakMarker(view, "line-break") },
          { key: "Shift-Enter", run: (view) => insertBreakMarker(view, "page-break") },
          { key: "Mod-Enter", run: () => true },
          { key: "Backspace", run: deleteBreakMarker },
          { key: "Delete", run: deleteBreakMarker },
        ])
      ),
      // The source text itself must never change from user input (typing,
      // paste, cut, drag-drop); annotations are the only editable layer.
      // Programmatic transactions (loading the text value) carry no
      // userEvent annotation and still go through.
      EditorState.changeFilter.of(
        (tr) => !tr.isUserEvent("input") && !tr.isUserEvent("delete")
      ),
      EditorView.updateListener.of((update) => {
        if (update.selectionSet) {
          handleSelectionComplete(update.state.selection);
        }
      }),
      EditorView.theme({
        "&": {
          fontSize: "16px",
          lineHeight: "1.5",
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
          overflow: "auto",
          height: "100%",
          scrollBehavior: "smooth",
          scrollbarWidth: hideScrollbar ? "none" : "auto", // Firefox
          msOverflowStyle: hideScrollbar ? "none" : "auto", // IE/Edge
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
          width: hideScrollbar ? "0px" : "8px",
          height: hideScrollbar ? "0px" : "8px",
        },
        ".cm-scroller::-webkit-scrollbar-track": {
          background: hideScrollbar ? "transparent" : "#f8f9fa",
          borderRadius: "6px",
        },
        ".cm-scroller::-webkit-scrollbar-thumb": {
          background: hideScrollbar ? "transparent" : "#6c757d",
          borderRadius: "6px",
          border: hideScrollbar ? "none" : "2px solid #f8f9fa",
        },
        ".cm-scroller::-webkit-scrollbar-thumb:hover": {
          background: hideScrollbar ? "transparent" : "#495057",
        },
        ".cm-scroller::-webkit-scrollbar-corner": {
          background: hideScrollbar ? "transparent" : "#f8f9fa",
        },
      }),
    ];

    // Update highlighted annotation when highlightedAnnotationId changes
    useEffect(() => {
      if (editorReady && editorRef.current?.view) {
        const view = editorRef.current.view;

        // Save current scroll position
        const scrollElement = view.scrollDOM;
        const scrollTop = scrollElement.scrollTop;
        const scrollLeft = scrollElement.scrollLeft;

        view.dispatch({
          effects: [
            setHighlightedAnnotationEffect.of(highlightedAnnotationId || null),
          ],
        });

        // Re-add all annotations after highlighting changes
        if (annotations.length > 0) {
          annotations.forEach((annotation) => {
            view.dispatch({
              effects: addAnnotationEffect.of(annotation),
            });
          });
        }

        // Restore scroll position after a short delay to allow DOM updates
        requestAnimationFrame(() => {
          scrollElement.scrollTop = scrollTop;
          scrollElement.scrollLeft = scrollLeft;
        });
      }
    }, [highlightedAnnotationId, editorReady, annotations]);

    // Apply dynamic annotation styling
    useEffect(() => {
      const applyAnnotationStyles = async () => {
        try {
          const style = document.createElement("style");
          const baseStyles = `
            /* Level-based styles are defined in index.css */
            /* This ensures consistent styling across all components */
          `;

          const optimisticStyles = `
            .annotation-optimistic {
              animation: annotationFlash 0.4s ease-out;
              opacity: 0.85;
            }
            
            .annotation-agreed {
              background-color: #dcfce7 !important;
              border-color: #22c55e !important;
              color: #15803d !important;
              cursor: default !important;
              position: relative;
            }
            
            .annotation-agreed::after {
              content: "🔒";
              position: absolute;
              right: 2px;
              top: 50%;
              transform: translateY(-50%);
              font-size: 8px;
              pointer-events: none;
            }
            
            .annotation-label-agreed {
              background-color: #dcfce7 !important;
              border: 1px solid #22c55e !important;
              color: #15803d !important;
              cursor: default !important;
              font-weight: 600;
            }
            
            .annotation-highlighted {
              animation: annotationHighlight 1s ease-out;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5) !important;
              background-color: rgba(59, 130, 246, 0.2) !important;
              border-color: rgba(59, 130, 246, 0.8) !important;
              z-index: 10;
              position: relative;
            }
            
            .annotation-label-highlighted {
              animation: annotationHighlight 1s ease-out;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5) !important;
              background-color: rgba(59, 130, 246, 0.2) !important;
              border-color: rgba(59, 130, 246, 0.8) !important;
              z-index: 10;
              position: relative;
            }
            
            @keyframes annotationFlash {
              0% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
              }
              50% {
                transform: scale(1.03);
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
              }
              100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
              }
            }
            
            @keyframes annotationHighlight {
              0% {
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
                background-color: rgba(59, 130, 246, 0.1);
              }
              50% {
                box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
                background-color: rgba(59, 130, 246, 0.3);
              }
              100% {
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
                background-color: rgba(59, 130, 246, 0.2);
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

    // Preserve scroll position when annotations change
    useEffect(() => {
      if (editorReady && editorRef.current?.view) {
        const view = editorRef.current.view;
        const scrollElement = view.scrollDOM;

        // Save current scroll position before any potential re-render
        const currentScrollTop = scrollElement.scrollTop;
        const currentScrollLeft = scrollElement.scrollLeft;

        // Schedule scroll position restoration after current render cycle
        const timeoutId = setTimeout(() => {
          if (
            scrollElement.scrollTop !== currentScrollTop ||
            scrollElement.scrollLeft !== currentScrollLeft
          ) {
            scrollElement.scrollTop = currentScrollTop;
            scrollElement.scrollLeft = currentScrollLeft;
          }
        }, 0);

        return () => clearTimeout(timeoutId);
      }
    }, [annotations.length, editorReady]); // Only when annotation count changes

    return (
      <div className="relative flex-1 min-h-0 min-w-0 pt-4 bg-white rounded-lg shadow-lg">
        <CodeMirror
          ref={editorRef}
          value={textRef.current}
          className="h-full"
          height="100%"
          extensions={extensions}
          readOnly={readOnly}
          onCreateEditor={(view) => {
            // Store the view in the editorRef for useImperativeHandle and useAnnotationEffects.
            // Annotations are applied only by useAnnotationEffects (which runs when editorReady
            // becomes true), so we never apply annotations on first paint—only when filter allows.
            if (editorRef.current) {
              editorRef.current.view = view;
            }
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

        <div className="text-xs text-gray-500 sticky w-max right-1 bottom-1 float-right border  rounded-md py-1 px-2">
          {!readOnly && (
            <span className="mr-3 text-gray-400">
              Enter: line break · Shift+Enter: page break · Backspace: remove
            </span>
          )}
          {textRef.current?.length || 0} characters
        </div>

        <BubbleMenu
          visible={bubbleMenuVisible}
          position={bubbleMenuPosition}
          currentSelection={currentSelection}
          annotationText={annotationText}
          annotationLevel={annotationLevel}
          selectedHeaderId={selectedHeaderId}
          annotations={annotations}
          isCreatingAnnotation={isCreatingAnnotation}
          contextAnnotation={annotationToEdit || undefined}
          onAddAnnotation={handleAddAnnotation}
          onCancel={resetBubbleMenu}
          onAnnotationTextChange={setAnnotationText}
          onAnnotationLevelChange={setAnnotationLevel}
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

        <EditPopup
          visible={editPopupVisible}
          position={editPopupPosition}
          annotation={annotationToEdit}
          content={text}
          isUpdatingAnnotation={isUpdatingAnnotation}
          onUpdate={handleUpdateAnnotation}
          onDelete={handleDeleteFromEdit}
          onCancel={resetEditPopup}
        />
      </div>
    );
  }
);

Editor.displayName = "Editor";
