import { useState } from "react";
import type {
  CurrentSelection,
  BubbleMenuPosition,
  DeletePopupPosition,
} from "../types";
import type { Annotation } from "@/pages/Task";

export const useEditorState = () => {
  const [currentSelection, setCurrentSelection] =
    useState<CurrentSelection | null>(null);
  const [bubbleMenuVisible, setBubbleMenuVisible] = useState(false);
  const [bubbleMenuPosition, setBubbleMenuPosition] =
    useState<BubbleMenuPosition>({
      x: 0,
      y: 0,
      transformX: "-50%",
    });
  const [annotationText, setAnnotationText] = useState("");
  const [selectedHeaderId, setSelectedHeaderId] = useState<string>("");
  const [deletePopupVisible, setDeletePopupVisible] = useState(false);
  const [deletePopupPosition, setDeletePopupPosition] =
    useState<DeletePopupPosition>({
      x: 0,
      y: 0,
    });
  const [annotationToDelete, setAnnotationToDelete] =
    useState<Annotation | null>(null);
  const [editorReady, setEditorReady] = useState(false);

  const resetBubbleMenu = () => {
    setBubbleMenuVisible(false);
    setAnnotationText("");
    setSelectedHeaderId("");
    setCurrentSelection(null);
  };

  const resetDeletePopup = () => {
    setDeletePopupVisible(false);
    setAnnotationToDelete(null);
  };

  const resetAll = () => {
    resetBubbleMenu();
    resetDeletePopup();
  };

  return {
    // State
    currentSelection,
    bubbleMenuVisible,
    bubbleMenuPosition,
    annotationText,
    selectedHeaderId,
    deletePopupVisible,
    deletePopupPosition,
    annotationToDelete,
    editorReady,

    // Setters
    setCurrentSelection,
    setBubbleMenuVisible,
    setBubbleMenuPosition,
    setAnnotationText,
    setSelectedHeaderId,
    setDeletePopupVisible,
    setDeletePopupPosition,
    setAnnotationToDelete,
    setEditorReady,

    // Reset functions
    resetBubbleMenu,
    resetDeletePopup,
    resetAll,
  };
};
