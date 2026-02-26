import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  IoChevronDown,
  IoChevronForward,
  IoPencil,
  IoTrash,
  IoAdd,
  IoCheckmark,
  IoClose,
} from "react-icons/io5";
import type { CategoryOutput } from "@/api/annotation_list";
import {
  useCreateAnnotationListItem,
  useUpdateAnnotationListItem,
  useDeleteAnnotationListItem,
} from "@/hooks/useAnnotationLists";

interface ErrorCategory extends CategoryOutput {
  id?: string;
  name: string;
  mnemonic?: string;
  description?: string;
  examples?: string[];
  notes?: string;
  level?: number;
  parent?: string;
  subcategories?: ErrorCategory[];
}

interface EditableAnnotationListProps {
  readonly categories: ErrorCategory[];
  readonly typeId: string;
  readonly onRefresh?: () => void;
}

interface EditFormData {
  name: string;
  description: string;
  level: string;
  mnemonic: string;
  notes: string;
}

export function EditableAnnotationList({
  categories,
  typeId,
  onRefresh,
}: EditableAnnotationListProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingChildId, setAddingChildId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: "",
    description: "",
    level: "",
    mnemonic: "",
    notes: "",
  });

  const updateMutation = useUpdateAnnotationListItem({ typeId });
  const createMutation = useCreateAnnotationListItem({ typeId });
  const deleteMutation = useDeleteAnnotationListItem({ typeId });

  // Auto-expand root level nodes
  useMemo(() => {
    if (categories.length > 0) {
      setExpandedNodes((prev) => {
        const newExpanded = new Set(prev);
        categories.forEach((cat) => {
          if (cat.id) {
            newExpanded.add(cat.id);
          }
        });
        return newExpanded;
      });
    }
  }, [categories]);

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const startEdit = (category: ErrorCategory) => {
    setEditingId(category.id || null);
    setEditForm({
      name: category.name || "",
      description: category.description || "",
      level: category.level?.toString() || "",
      mnemonic: category.mnemonic || "",
      notes: category.notes || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: "",
      description: "",
      level: "",
      mnemonic: "",
      notes: "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const meta: Record<string, any> = {};
    if (editForm.mnemonic) meta.mnemonic = editForm.mnemonic;
    if (editForm.notes) meta.notes = editForm.notes;

    try {
      await updateMutation.mutateAsync({
        itemId: editingId,
        item: {
          title: editForm.name,
          description: editForm.description || undefined,
          level: editForm.level || undefined,
          meta: Object.keys(meta).length > 0 ? meta : undefined,
        },
      });
      setEditingId(null);
      onRefresh?.();
    } catch (error: unknown) {
      // Error is handled by the hook
      console.error("Failed to update annotation item:", error);
    }
  };

  const startAddChild = (parentId: string) => {
    setAddingChildId(parentId);
    setEditForm({
      name: "",
      description: "",
      level: "",
      mnemonic: "",
      notes: "",
    });
  };

  const cancelAddChild = () => {
    setAddingChildId(null);
    setEditForm({
      name: "",
      description: "",
      level: "",
      mnemonic: "",
      notes: "",
    });
  };

  const saveAddChild = async () => {
    if (!addingChildId) return;

    const meta: Record<string, any> = {};
    if (editForm.mnemonic) meta.mnemonic = editForm.mnemonic;
    if (editForm.notes) meta.notes = editForm.notes;

    try {
      await createMutation.mutateAsync({
        title: editForm.name,
        type_id: typeId,
        parent_id: addingChildId,
        description: editForm.description || undefined,
        level: editForm.level || undefined,
        meta: Object.keys(meta).length > 0 ? meta : undefined,
      });
      setAddingChildId(null);
      onRefresh?.();
    } catch (error: unknown) {
      // Error is handled by the hook
      console.error("Failed to create annotation item:", error);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      await deleteMutation.mutateAsync(deletingId);
      setDeletingId(null);
      onRefresh?.();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const CategoryItem = ({
    category,
    level = 0,
  }: {
    category: ErrorCategory;
    level?: number;
  }) => {
    const hasChildren =
      category.subcategories && category.subcategories.length > 0;
    const isExpanded = category.id ? expandedNodes.has(category.id) : false;
    const isEditing = editingId === category.id;
    const isAddingChild = addingChildId === category.id;

    const indentColors = [
      "border-blue-200 bg-blue-50 hover:bg-blue-100",
      "border-purple-200 bg-purple-50 hover:bg-purple-100",
      "border-pink-200 bg-pink-50 hover:bg-pink-100",
      "border-indigo-200 bg-indigo-50 hover:bg-indigo-100",
      "border-cyan-200 bg-cyan-50 hover:bg-cyan-100",
    ];

    const levelColors = [
      "bg-blue-100 text-blue-700",
      "bg-purple-100 text-purple-700",
      "bg-pink-100 text-pink-700",
      "bg-indigo-100 text-indigo-700",
      "bg-cyan-100 text-cyan-700",
    ];

    return (
      <div style={{ marginLeft: `${level * 16}px` }} className="mb-2">
        <div
          className={`w-full p-3 rounded-lg border transition-all duration-200 group ${
            indentColors[level % indentColors.length]
          }`}
        >
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label htmlFor={`name-${category.id}`} className="text-xs font-medium text-gray-700 block mb-1">
                  Name *
                </label>
                <input
                  id={`name-${category.id}`}
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Category name"
                />
              </div>
              <div>
                <label htmlFor={`description-${category.id}`} className="text-xs font-medium text-gray-700 block mb-1">
                  Description
                </label>
                <Textarea
                  id={`description-${category.id}`}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="mt-1"
                  placeholder="Category description"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`level-${category.id}`} className="text-xs font-medium text-gray-700 block mb-1">
                    Level
                  </label>
                  <input
                    id={`level-${category.id}`}
                    type="number"
                    value={editForm.level}
                    onChange={(e) =>
                      setEditForm({ ...editForm, level: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Level"
                  />
                </div>
                <div>
                  <label htmlFor={`mnemonic-${category.id}`} className="text-xs font-medium text-gray-700 block mb-1">
                    Mnemonic
                  </label>
                  <input
                    id={`mnemonic-${category.id}`}
                    type="text"
                    value={editForm.mnemonic}
                    onChange={(e) =>
                      setEditForm({ ...editForm, mnemonic: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mnemonic"
                  />
                </div>
              </div>
              <div>
                <label htmlFor={`notes-${category.id}`} className="text-xs font-medium text-gray-700 block mb-1">
                  Notes
                </label>
                <Textarea
                  id={`notes-${category.id}`}
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  className="mt-1"
                  placeholder="Additional notes"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={!editForm.name.trim() || updateMutation.isPending}
                >
                  <IoCheckmark className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={updateMutation.isPending}
                >
                  <IoClose className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (category.id) {
                      toggleNodeExpansion(category.id);
                    }
                  }}
                  className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-sm flex-shrink-0 mt-0.5"
                >
                  {isExpanded ? (
                    <IoChevronDown className="h-4 w-4" />
                  ) : (
                    <IoChevronForward className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <div className="h-6 w-6 flex-shrink-0" />
              )}

              <span
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                  levelColors[level % levelColors.length]
                }`}
              >
                L{level}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {category.name}
                  </h4>
                  {category.mnemonic && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {category.mnemonic}
                    </span>
                  )}
                </div>
                {category.description && (
                  <p className="text-xs text-gray-600 mb-1">
                    {category.description}
                  </p>
                )}
                {category.examples && category.examples.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {category.examples.length} example(s)
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startAddChild(category.id!)}
                      className="h-7 w-7 p-0"
                    >
                      <IoAdd className="h-4 w-4 text-green-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add child</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(category)}
                      className="h-7 w-7 p-0"
                    >
                      <IoPencil className="h-4 w-4 text-blue-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(category.id || null)}
                      className="h-7 w-7 p-0"
                    >
                      <IoTrash className="h-4 w-4 text-red-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          {isAddingChild && (
            <div className="mt-3 p-3 bg-white rounded border border-gray-200 space-y-3">
              <h5 className="text-sm font-medium text-gray-900">
                Add Child Category
              </h5>
              <div>
                <label htmlFor={`child-name-${category.id}`} className="text-xs font-medium text-gray-700 block mb-1">
                  Name *
                </label>
                <input
                  id={`child-name-${category.id}`}
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Category name"
                />
              </div>
              <div>
                <label
                  htmlFor={`child-description-${category.id}`}
                  className="text-xs font-medium text-gray-700 block mb-1"
                >
                  Description
                </label>
                <Textarea
                  id={`child-description-${category.id}`}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="mt-1"
                  placeholder="Category description"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`child-level-${category.id}`} className="text-xs font-medium text-gray-700 block mb-1">
                    Level
                  </label>
                  <input
                    id={`child-level-${category.id}`}
                    type="number"
                    value={editForm.level}
                    onChange={(e) =>
                      setEditForm({ ...editForm, level: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Level"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`child-mnemonic-${category.id}`}
                    className="text-xs font-medium text-gray-700 block mb-1"
                  >
                    Mnemonic
                  </label>
                  <input
                    id={`child-mnemonic-${category.id}`}
                    type="text"
                    value={editForm.mnemonic}
                    onChange={(e) =>
                      setEditForm({ ...editForm, mnemonic: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mnemonic"
                  />
                </div>
              </div>
              <div>
                <label htmlFor={`child-notes-${category.id}`} className="text-xs font-medium text-gray-700 block mb-1">
                  Notes
                </label>
                <Textarea
                  id={`child-notes-${category.id}`}
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  className="mt-1"
                  placeholder="Additional notes"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={saveAddChild}
                  disabled={!editForm.name.trim() || createMutation.isPending}
                >
                  <IoCheckmark className="w-4 h-4 mr-1" />
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelAddChild}
                  disabled={createMutation.isPending}
                >
                  <IoClose className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {hasChildren && isExpanded && category.subcategories && (
          <div className="mt-2 space-y-2">
            {category.subcategories.map((subcat) => (
              <CategoryItem
                key={subcat.id}
                category={subcat}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {categories.map((category) => (
        <CategoryItem key={category.id} category={category} level={0} />
      ))}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot
              be undone. If this category has children, they will also be
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
