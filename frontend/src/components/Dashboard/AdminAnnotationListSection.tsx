import React, { useState, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  IoList,
  IoClose,
  IoCheckmarkCircle,
  IoCloudUpload,
  IoDocumentText,
  IoTrash,
  IoEye,
  IoFolder,
} from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { annotationListApi } from "@/api/annotation_list";
import type {
  AnnotationListUploadResponse,
  CategoryOutput,
} from "@/api/annotation_list";
import { useAnnotationTypes } from "@/hooks/useAnnotationTypes";
import { useAnnotationListHierarchical } from "@/hooks/useAnnotationListHierarchical";
import { useUploadAnnotationList } from "@/hooks/useUploadAnnotationList";
import { useDeleteAnnotationListByType } from "@/hooks/useDeleteAnnotationListByType";
import { queryKeys } from "@/constants/queryKeys";
import { useQueryClient } from "@tanstack/react-query";

export const AdminAnnotationListSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] =
    useState<AnnotationListUploadResponse | null>(null);
  const [currentStep, setCurrentStep] = useState<
    "select" | "uploading" | "success"
  >("select");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all annotation lists using custom hook
  const { data: allAnnotationTypes } = useAnnotationTypes();

  // Fetch hierarchical data for selected type using custom hook
  const { data: hierarchicalData } = useAnnotationListHierarchical({
    type_id: selectedType || "",
    enabled: !!selectedType,
  });

  // Upload mutation using custom hook
  const uploadMutation = useUploadAnnotationList({
    onSuccess: (data) => {
      setUploadResult(data);
      setCurrentStep("success");
    },
    onError: () => {
      setCurrentStep("select");
    },
  });

  // Delete mutation using custom hook
  const deleteMutation = useDeleteAnnotationListByType({
    onSuccess: () => {
      if (selectedType) {
        setSelectedType(null);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.annotationTypes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotationLists.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.annotationLists.types });
    },
  });

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    if (!annotationListApi.validateFileType(file)) {
      toast.error("Invalid file type", {
        description: "Please select a JSON file",
      });
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!annotationListApi.validateFileType(file)) {
      toast.error("Invalid file type", {
        description: "Please select a JSON file",
      });
      return;
    }

    // Validate JSON structure
    const validation = await annotationListApi.validateJsonStructure(file);
    if (!validation.valid) {
      toast.error("Invalid JSON structure", {
        description: validation.error,
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    setCurrentStep("uploading");
    uploadMutation.mutate(selectedFile);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setCurrentStep("select");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = (type: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete all records for "${type}"? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate(type);
    }
  };

  // Render category tree
  const renderCategory = (category: CategoryOutput, depth: number = 0) => {
    const indent = depth * 20;
    return (
      <div key={category.id || category.name} className="space-y-1">
        <div
          className="flex items-start gap-2 p-2 rounded hover:bg-gray-50"
          style={{ marginLeft: `${indent}px` }}
        >
          <IoFolder className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{category.name}</span>
              {category.level !== undefined && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  Level {category.level}
                </span>
              )}
              {category.mnemonic && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {category.mnemonic}
                </span>
              )}
            </div>
            {category.description && (
              <p className="text-xs text-gray-600 mt-1">
                {category.description}
              </p>
            )}
            {category.examples && category.examples.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {category.examples.length} example(s)
              </p>
            )}
          </div>
        </div>
        {category.subcategories &&
          category.subcategories.map((subcat) =>
            renderCategory(subcat, depth + 1)
          )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IoCloudUpload className="w-5 h-5" />
            Upload Annotation List
          </CardTitle>
          <CardDescription>
            Upload hierarchical annotation typologies (MQM, custom error types,
            etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === "select" && (
            <div className="space-y-6">
              {/* File Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <IoCloudUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drop JSON file here or click to browse
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  Hierarchical annotation list in JSON format
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected File */}
              {selectedFile && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Selected File</h3>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <IoDocumentText className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {annotationListApi.formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={handleUpload}>
                        <IoCloudUpload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        <IoClose className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === "uploading" && (
            <div className="text-center py-8">
              <AiOutlineLoading3Quarters className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700">
                Uploading annotation list...
              </p>
              <p className="text-gray-500 text-sm">
                Creating hierarchical records in database
              </p>
            </div>
          )}

          {currentStep === "success" && uploadResult && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Upload Successful</h3>
                <Button variant="ghost" onClick={handleReset}>
                  Upload Another
                </Button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <IoCheckmarkCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900">
                      {uploadResult.message}
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Type: {uploadResult.root_type}
                    </p>
                    <p className="text-sm text-green-700">
                      Records created: {uploadResult.total_records_created}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Annotation Lists */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IoList className="w-5 h-5" />
            Annotation Lists
          </CardTitle>
          <CardDescription>
            View and manage uploaded annotation typologies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allAnnotationTypes?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <IoList className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No annotation lists uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allAnnotationTypes?.map((type) => {
                return (
                  <Card key={type.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {type.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setSelectedType(selectedType === type.id ? null : type.id)
                            }
                          >
                            <IoEye className={`w-4 h-4 ${selectedType === type.id ? "text-blue-600" : "text-gray-600"}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(type.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <IoTrash className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Hierarchical View */}
          {selectedType && hierarchicalData && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">
                  {hierarchicalData.title}
                </CardTitle>
                {hierarchicalData.version && (
                  <p className="text-sm text-gray-500">
                    Version: {hierarchicalData.version}
                  </p>
                )}
                {hierarchicalData.description && (
                  <CardDescription>
                    {hierarchicalData.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {hierarchicalData.categories.map((category) =>
                    renderCategory(category)
                  )}
                </div>
                {hierarchicalData.copyright && (
                  <p className="text-xs text-gray-400 mt-4 border-t pt-4">
                    {hierarchicalData.copyright}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

