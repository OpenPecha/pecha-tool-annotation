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
  const [annotationLevel, setAnnotationLevel] = useState("");
  const [selectedHeaderId, setSelectedHeaderId] = useState<string>("");
  const [deletePopupVisible, setDeletePopupVisible] = useState(false);
  const [deletePopupPosition, setDeletePopupPosition] =
    useState<DeletePopupPosition>({
      x: 0,
      y: 0,
    });
  const [annotationToDelete, setAnnotationToDelete] =
    useState<Annotation | null>(null);
  const [editPopupVisible, setEditPopupVisible] = useState(false);
  const [editPopupPosition, setEditPopupPosition] =
    useState<DeletePopupPosition>({
      x: 0,
      y: 0,
    });
  const [annotationToEdit, setAnnotationToEdit] = useState<Annotation | null>(
    null
  );
  const [editorReady, setEditorReady] = useState(false);

  const resetBubbleMenu = () => {
    setBubbleMenuVisible(false);
    setAnnotationText("");
    setAnnotationLevel("");
    setSelectedHeaderId("");
    setCurrentSelection(null);
  };

  const resetDeletePopup = () => {
    setDeletePopupVisible(false);
    setAnnotationToDelete(null);
  };

  const resetEditPopup = () => {
    setEditPopupVisible(false);
    setAnnotationToEdit(null);
  };

  const resetAll = () => {
    resetBubbleMenu();
    resetDeletePopup();
    resetEditPopup();
  };

  return {
    // State
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

    // Setters
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

    // Reset functions
    resetBubbleMenu,
    resetDeletePopup,
    resetEditPopup,
    resetAll,
  };
};
