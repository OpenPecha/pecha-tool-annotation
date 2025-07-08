import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/use-auth-hook";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { textApi } from "@/api/text";
import {
  Loader2,
  Users,
  BarChart3,
  FileText,
  Settings,
  Upload,
  X,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import BulkUploadModal from "@/components/BulkUploadModal";
import type { BulkUploadResponse } from "@/api/bulk-upload";
import { bulkUploadApi } from "@/api/bulk-upload";

interface FileValidationResult {
  filename: string;
  valid: boolean;
  errors: string[];
  text_title?: string;
  annotations_count: number;
}

interface UploadResult {
  filename: string;
  success: boolean;
  text_id?: number;
  created_annotations: number;
  error?: string;
  validation_errors?: string[];
}
import { AdminStatisticsCharts } from "@/components/AdminStatisticsCharts";
import { UserManagement } from "@/components/UserManagement";

// Icons for the dashboard cards
const StartWorkIcon = () => (
  <svg
    className="w-12 h-12 text-blue-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
    />
  </svg>
);

const ReviewWorkIcon = () => (
  <svg
    className="w-12 h-12 text-green-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const RecentActivityIcon = () => (
  <svg
    className="w-6 h-6 text-gray-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const BulkUploadIcon = () => (
  <svg
    className="w-12 h-12 text-purple-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    />
  </svg>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<
    "statistics" | "users" | "work" | "bulk-upload"
  >("work");
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Bulk upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [validationResults, setValidationResults] = useState<
    FileValidationResult[] | null
  >(null);
  const [uploadResults, setUploadResults] = useState<BulkUploadResponse | null>(
    null
  );
  const [currentStep, setCurrentStep] = useState<
    "select" | "validate" | "upload" | "results"
  >("select");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutation to start work - find work in progress or assign new text
  const startWorkMutation = useMutation({
    mutationFn: async () => {
      return textApi.startWork();
    },
    onSuccess: (text) => {
      toast.success(`✅ Work Started`, {
        description: `Starting work on: "${text.title}"`,
      });
      navigate(`/task/${text.id}`);
      setIsLoadingText(false);
    },
    onError: (error) => {
      // Extract error message from different error types
      let errorMessage = "Failed to start work";
      let errorTitle = "❌ Error";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "detail" in error) {
        // Handle API errors with detail field
        const apiError = error as { detail: string; status_code?: number };
        errorMessage = apiError.detail || "Failed to start work";

        // Handle 404 specifically for "no texts available" scenario
        if (apiError.status_code === 404) {
          errorTitle = "📝 No Tasks Available";
          errorMessage =
            "No texts available for annotation at this time. Please contact your administrator to add more texts to the system.";
        }
      }

      // Show toast with proper error handling
      if (errorTitle.includes("No Tasks Available")) {
        toast.info(errorTitle, {
          description: errorMessage,
        });
      } else {
        toast.error(errorTitle, {
          description: errorMessage,
        });
      }

      setIsLoadingText(false);
    },
  });

  const handleStartWork = () => {
    setIsLoadingText(true);
    startWorkMutation.mutate();
  };

  const handleReviewWork = () => {
    // TODO: Implement similar functionality for review texts
    toast.info("🚧 Coming Soon", {
      description: "Review functionality will be implemented soon!",
    });
  };

  // Fetch recent activity data from API
  const { data: recentActivity = [], isLoading: isLoadingActivity } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: () => textApi.getRecentActivity(10),
    refetchOnWindowFocus: false,
  });

  // Fetch user statistics
  const { data: userStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["user-stats"],
    queryFn: () => textApi.getUserStats(),
    refetchOnWindowFocus: false,
  });

  // Fetch admin text statistics (only for admins)
  const { data: adminStats, isLoading: isLoadingAdminStats } = useQuery({
    queryKey: ["admin-text-statistics"],
    queryFn: () => textApi.getAdminTextStatistics(),
    refetchOnWindowFocus: false,
    enabled: currentUser?.role === "admin", // Only fetch for admins
  });

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper function to determine activity type
  const getActivityType = (text: { reviewer_id?: number }) => {
    // If user is reviewer, it's a review activity
    if (text.reviewer_id === currentUser?.id) {
      return "review";
    }
    // Otherwise, it's an annotation activity
    return "annotation";
  };

  // Handle clicking on recent activity item
  const handleActivityClick = (textId: number) => {
    navigate(`/task/${textId}`);
  };

  const handleBulkUpload = () => {
    setShowBulkUploadModal(true);
  };

  const handleBulkUploadComplete = (result: BulkUploadResponse) => {
    // Refresh the page data or update relevant queries
    if (result.success) {
      toast.success("Bulk upload completed successfully!", {
        description: `${result.summary.total_texts_created} texts and ${result.summary.total_annotations_created} annotations created`,
      });
    }
    setShowBulkUploadModal(false);
  };

  // Fetch user's work in progress
  const { data: workInProgress = [] } = useQuery({
    queryKey: ["my-work-in-progress"],
    queryFn: () => textApi.getMyWorkInProgress(),
    refetchOnWindowFocus: false,
  });

  // Mutation to cancel work (delete user annotations and skip text)
  const cancelWorkMutation = useMutation({
    mutationFn: async () => {
      // Get current work in progress to get the text ID
      const workInProgress = await textApi.getMyWorkInProgress();
      if (workInProgress.length === 0) {
        throw new Error("No work in progress found");
      }

      const currentTextId = workInProgress[0].id;

      // Cancel work: delete user annotations and skip text
      return textApi.cancelWorkWithRevertAndSkip(currentTextId);
    },
    onSuccess: () => {
      toast.success("✅ Work Cancelled & Skipped", {
        description:
          "Your annotations were deleted and text was skipped. It won't be shown to you again.",
      });
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["my-work-in-progress"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["admin-text-statistics"] });
    },
    onError: (error) => {
      toast.error("❌ Failed to Cancel Work", {
        description:
          error instanceof Error ? error.message : "Failed to cancel work",
      });
    },
  });

  const handleCancelWork = () => {
    cancelWorkMutation.mutate();
  };

  // Bulk upload mutations
  const validateMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      return bulkUploadApi.validateFiles(formData);
    },
    onSuccess: (data) => {
      setValidationResults(data.results);
      setCurrentStep("validate");
    },
    onError: (error) => {
      toast.error("Validation failed", {
        description: error.message || "Failed to validate files",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      return bulkUploadApi.uploadFiles(formData);
    },
    onSuccess: (data) => {
      setUploadResults(data);
      setCurrentStep("results");

      if (data.success) {
        toast.success("Bulk upload completed!", {
          description: `Successfully uploaded ${data.successful_files} out of ${data.total_files} files`,
        });
      } else {
        toast.warning("Upload completed with errors", {
          description: `${data.successful_files} successful, ${data.failed_files} failed`,
        });
      }
    },
    onError: (error) => {
      toast.error("Upload failed", {
        description: error.message || "Failed to upload files",
      });
    },
  });

  // Bulk upload handlers
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
    const jsonFiles = files.filter((file) => file.name.endsWith(".json"));

    if (jsonFiles.length === 0) {
      toast.error("No JSON files found", {
        description: "Please select JSON files for upload",
      });
      return;
    }

    if (jsonFiles.length !== files.length) {
      toast.warning("Some files skipped", {
        description: "Only JSON files are supported",
      });
    }

    setSelectedFiles(jsonFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const jsonFiles = files.filter((file) => file.name.endsWith(".json"));

    if (jsonFiles.length === 0) {
      toast.error("No JSON files found", {
        description: "Please select JSON files for upload",
      });
      return;
    }

    setSelectedFiles(jsonFiles);
  };

  const handleValidate = () => {
    if (selectedFiles.length === 0) return;
    setCurrentStep("upload");
    validateMutation.mutate(selectedFiles);
  };

  const handleUploadFiles = () => {
    if (selectedFiles.length === 0) return;
    setCurrentStep("upload");
    uploadMutation.mutate(selectedFiles);
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setValidationResults(null);
    setUploadResults(null);
    setCurrentStep("select");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getStatusIcon = (result: UploadResult | FileValidationResult) => {
    if ("success" in result) {
      return result.success ? (
        <CheckCircle className="w-5 h-5 text-green-600" />
      ) : (
        <XCircle className="w-5 h-5 text-red-600" />
      );
    } else {
      return result.valid ? (
        <CheckCircle className="w-5 h-5 text-green-600" />
      ) : (
        <XCircle className="w-5 h-5 text-red-600" />
      );
    }
  };

  // Admin Dashboard Layout
  if (currentUser?.role === "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="flex">
          {/* Admin Sidebar */}
          <div
            className={`${
              sidebarOpen ? "w-64" : "w-16"
            } transition-all duration-300 bg-white shadow-lg border-r border-gray-200`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-8">
                <h2
                  className={`font-bold text-xl text-gray-800 ${
                    sidebarOpen ? "block" : "hidden"
                  }`}
                >
                  Admin Panel
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setActiveAdminTab("work")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeAdminTab === "work"
                      ? "bg-green-100 text-green-700 border-2 border-green-200"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  {sidebarOpen && <span>Work Management</span>}
                </button>

                <button
                  onClick={() => setActiveAdminTab("statistics")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeAdminTab === "statistics"
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-200"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  {sidebarOpen && <span>Statistics</span>}
                </button>

                <button
                  onClick={() => setActiveAdminTab("users")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeAdminTab === "users"
                      ? "bg-purple-100 text-purple-700 border-2 border-purple-200"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Users className="w-5 h-5" />
                  {sidebarOpen && <span>Users</span>}
                </button>

                <button
                  onClick={() => setActiveAdminTab("bulk-upload")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeAdminTab === "bulk-upload"
                      ? "bg-orange-100 text-orange-700 border-2 border-orange-200"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Upload className="w-5 h-5" />
                  {sidebarOpen && <span>Bulk Upload</span>}
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-600">
                System administration and management tools
              </p>
            </div>

            {/* Statistics Tab */}
            {activeAdminTab === "statistics" && (
              <div>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      System Statistics
                    </CardTitle>
                    <CardDescription>
                      Overview of system-wide text status and user activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingAdminStats ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="ml-2 text-blue-600">
                          Loading statistics...
                        </span>
                      </div>
                    ) : adminStats ? (
                      <AdminStatisticsCharts statistics={adminStats} />
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        Failed to load statistics
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* User Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      User Statistics
                    </CardTitle>
                    <CardDescription>
                      Your personal annotation progress
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStats ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-blue-600">
                          Loading user stats...
                        </span>
                      </div>
                    ) : userStats ? (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {userStats.total_annotations}
                          </div>
                          <div className="text-sm text-blue-600">
                            Total Annotations
                          </div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {userStats.texts_annotated}
                          </div>
                          <div className="text-sm text-green-600">
                            Texts Annotated
                          </div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {userStats.reviews_completed}
                          </div>
                          <div className="text-sm text-purple-600">
                            Reviews Completed
                          </div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {userStats.accuracy_rate}%
                          </div>
                          <div className="text-sm text-orange-600">
                            Accuracy Rate
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        Failed to load user statistics
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Users Tab */}
            {activeAdminTab === "users" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Manage system users, roles, and permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserManagement />
                </CardContent>
              </Card>
            )}

            {/* Work Management Tab */}
            {activeAdminTab === "work" && (
              <div className="space-y-6">
                {/* Start Work Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Work Management
                    </CardTitle>
                    <CardDescription>
                      Manage annotation tasks and work in progress
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Start Working Card */}
                      <Card className="border-2 border-blue-200 bg-blue-50">
                        <CardHeader className="text-center">
                          <StartWorkIcon />
                          <CardTitle className="text-xl">
                            Start Working
                          </CardTitle>
                          <CardDescription>
                            Begin annotating texts as an admin
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button
                            size="lg"
                            className="w-full"
                            onClick={handleStartWork}
                            disabled={isLoadingText}
                          >
                            {isLoadingText ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Finding Text...
                              </>
                            ) : (
                              "Start Annotating"
                            )}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Work in Progress */}
                      <Card className="border-2 border-orange-200 bg-orange-50">
                        <CardHeader className="text-center">
                          <CardTitle className="text-xl">
                            Work in Progress
                          </CardTitle>
                          <CardDescription>
                            Your current annotation tasks
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {workInProgress.length > 0 ? (
                            <div className="space-y-3">
                              {workInProgress.map((text) => (
                                <div
                                  key={text.id}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium">{text.title}</p>
                                    <p className="text-sm text-gray-500">
                                      {formatDate(
                                        text.updated_at || text.created_at
                                      )}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => navigate(`/task/${text.id}`)}
                                  >
                                    Continue
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-gray-500">
                              No work in progress
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RecentActivityIcon />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>
                      Recent system-wide annotation activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingActivity ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                        <p className="text-gray-500">
                          Loading recent activity...
                        </p>
                      </div>
                    ) : recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {recentActivity.map((text) => (
                          <div
                            key={text.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {text.title}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {formatDate(
                                    text.updated_at || text.created_at
                                  )}{" "}
                                  • {text.status}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActivityClick(text.id)}
                            >
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No recent activity yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Bulk Upload Tab */}
            {activeAdminTab === "bulk-upload" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Bulk Upload
                  </CardTitle>
                  <CardDescription>
                    Upload multiple JSON files containing texts and annotations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Step 1: File Selection */}
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
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-700 mb-2">
                          Drop JSON files here or click to browse
                        </p>
                        <p className="text-gray-500 text-sm mb-4">
                          Support for multiple .json files
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Select Files
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".json"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>

                      {/* Selected Files */}
                      {selectedFiles.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="font-medium text-gray-900">
                            Selected Files ({selectedFiles.length})
                          </h3>
                          <div className="space-y-2">
                            {selectedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center space-x-3">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium">
                                    {file.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFiles((files) =>
                                      files.filter((_, i) => i !== index)
                                    );
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          <div className="flex space-x-3">
                            <Button
                              onClick={handleValidate}
                              disabled={selectedFiles.length === 0}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Validate Files
                            </Button>
                            <Button
                              onClick={handleUploadFiles}
                              disabled={selectedFiles.length === 0}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Files
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Validation Results */}
                  {currentStep === "validate" && validationResults && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">
                          Validation Results
                        </h3>
                        <Button variant="ghost" onClick={handleReset}>
                          <X className="w-4 h-4 mr-2" />
                          Reset
                        </Button>
                      </div>

                      {/* Validation Summary */}
                      <div className="grid grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold text-blue-600">
                              {validationResults.filter((r) => r.valid).length}
                            </div>
                            <div className="text-sm text-gray-600">
                              Valid Files
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold text-red-600">
                              {validationResults.filter((r) => !r.valid).length}
                            </div>
                            <div className="text-sm text-gray-600">
                              Invalid Files
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold text-gray-600">
                              {validationResults.reduce(
                                (sum, r) => sum + r.annotations_count,
                                0
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              Total Annotations
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* File Details */}
                      <div className="space-y-2">
                        {validationResults.map((result: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {getStatusIcon(result)}
                                <div>
                                  <p className="font-medium">
                                    {result.filename}
                                  </p>
                                  {result.valid && result.text_title && (
                                    <p className="text-sm text-gray-600">
                                      "{result.text_title}" -{" "}
                                      {result.annotations_count} annotations
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {result.errors.length > 0 && (
                              <div className="mt-3 p-3 bg-red-50 rounded">
                                <p className="text-sm font-medium text-red-800 mb-1">
                                  Errors:
                                </p>
                                <ul className="text-sm text-red-700 space-y-1">
                                  {result.errors.map(
                                    (error: string, errorIndex: number) => (
                                      <li key={errorIndex}>• {error}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex space-x-3">
                        <Button
                          onClick={handleUploadFiles}
                          disabled={
                            validationResults.filter((r: any) => r.valid)
                              .length === 0
                          }
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Valid Files
                        </Button>
                        <Button variant="outline" onClick={handleReset}>
                          Select Different Files
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Upload Progress */}
                  {currentStep === "upload" && (
                    <div className="space-y-6">
                      <div className="text-center py-8">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-700">
                          {validateMutation.isPending
                            ? "Validating files..."
                            : "Uploading files..."}
                        </p>
                        <p className="text-gray-500 text-sm">
                          Please wait while we process your files
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Upload Results */}
                  {currentStep === "results" && uploadResults && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">
                          Upload Results
                        </h3>
                        <Button variant="ghost" onClick={handleReset}>
                          Upload More Files
                        </Button>
                      </div>

                      {/* Upload Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold text-green-600">
                              {uploadResults.successful_files}
                            </div>
                            <div className="text-sm text-gray-600">
                              Successful
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold text-red-600">
                              {uploadResults.failed_files}
                            </div>
                            <div className="text-sm text-gray-600">Failed</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold text-blue-600">
                              {uploadResults.summary.total_texts_created}
                            </div>
                            <div className="text-sm text-gray-600">
                              Texts Created
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold text-purple-600">
                              {uploadResults.summary.total_annotations_created}
                            </div>
                            <div className="text-sm text-gray-600">
                              Annotations Created
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Detailed Results */}
                      <div className="space-y-2">
                        {uploadResults.results.map(
                          (result: any, index: number) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  {getStatusIcon(result)}
                                  <div>
                                    <p className="font-medium">
                                      {result.filename}
                                    </p>
                                    {result.success && (
                                      <p className="text-sm text-gray-600">
                                        Text ID: {result.text_id} -{" "}
                                        {result.created_annotations} annotations
                                        created
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {result.error && (
                                <div className="mt-3 p-3 bg-red-50 rounded">
                                  <p className="text-sm font-medium text-red-800 mb-1">
                                    Error:
                                  </p>
                                  <p className="text-sm text-red-700">
                                    {result.error}
                                  </p>
                                </div>
                              )}

                              {result.validation_errors &&
                                result.validation_errors.length > 0 && (
                                  <div className="mt-3 p-3 bg-red-50 rounded">
                                    <p className="text-sm font-medium text-red-800 mb-1">
                                      Validation Errors:
                                    </p>
                                    <ul className="text-sm text-red-700 space-y-1">
                                      {result.validation_errors.map(
                                        (error: string, errorIndex: number) => (
                                          <li key={errorIndex}>• {error}</li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Regular User Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {currentUser?.name || "User"}!
          </h1>
          <p className="text-gray-600">
            Here's your annotation progress and available tasks.
          </p>
        </div>

        {/* User Statistics Cards */}
        <div
          className="grid gap-6 mb-8"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          {/* Combined Start Working / Current Work Card - Show for annotators, users without role, or admins */}
          {(!currentUser?.role ||
            currentUser.role === "annotator" ||
            currentUser.role === "admin") && (
            <Card
              className={`hover:shadow-lg transition-all duration-300 border-2 ${
                workInProgress.length > 0
                  ? "border-orange-200 bg-orange-50"
                  : "hover:border-blue-200"
              } ${isLoadingText ? "opacity-75" : ""}`}
            >
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <StartWorkIcon />
                </div>
                <CardTitle className="text-2xl">
                  {workInProgress.length > 0 ? "Current Work" : "Start Working"}
                </CardTitle>
                <CardDescription className="text-base">
                  {workInProgress.length > 0
                    ? "Continue working on your text in progress"
                    : "Begin annotating new texts or continue working on existing annotations"}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                {workInProgress.length > 0 ? (
                  // Show current work details
                  <div className="space-y-4">
                    {workInProgress.map((text) => (
                      <div key={text.id} className="text-left">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {text.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              Status: {text.status} • Started:{" "}
                              {formatDate(text.updated_at || text.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="lg"
                            className="flex-1"
                            onClick={() => navigate(`/task/${text.id}`)}
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Show start working interface
                  <>
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleStartWork}
                      disabled={isLoadingText}
                    >
                      {isLoadingText ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Finding Text...
                        </>
                      ) : (
                        "Start Annotating"
                      )}
                    </Button>
                    <p className="text-sm text-gray-500 mt-3">
                      {isLoadingText
                        ? "Looking for available texts to annotate..."
                        : "Create new annotations, mark headers, identify persons and objects"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Review Work Card - Show for reviewers or admins */}
          {(currentUser?.role === "reviewer" ||
            currentUser?.role === "admin") && (
            <Card
              className="hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-green-200"
              onClick={handleReviewWork}
            >
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <ReviewWorkIcon />
                </div>
                <CardTitle className="text-2xl">Review Work</CardTitle>
                <CardDescription className="text-base">
                  Review and validate existing annotations from yourself or
                  other contributors
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full"
                  onClick={() => {}}
                >
                  Start Reviewing
                </Button>
                <p className="text-sm text-gray-500 mt-3">
                  Quality check annotations, approve or suggest improvements
                </p>
              </CardContent>
            </Card>
          )}

          {/* Bulk Upload Card - Show for admins only */}
          {currentUser?.role === "admin" && (
            <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-purple-200">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <BulkUploadIcon />
                </div>
                <CardTitle className="text-2xl">Bulk Upload</CardTitle>
                <CardDescription className="text-base">
                  Upload multiple JSON files containing texts and annotations
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-purple-200 hover:bg-purple-50"
                  onClick={handleBulkUpload}
                >
                  Upload Files
                </Button>
                <p className="text-sm text-gray-500 mt-3">
                  Batch import texts and annotations from JSON files
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity Section */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <RecentActivityIcon />
              <CardTitle>Recent Activity</CardTitle>
            </div>
            <CardDescription>
              Your recent work and contributions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading recent activity...</p>
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((text) => {
                  const activityType = getActivityType(text);
                  return (
                    <div
                      key={text.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            activityType === "annotation"
                              ? "bg-blue-500"
                              : "bg-green-500"
                          }`}
                        ></div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {text.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(text.updated_at || text.created_at)} •{" "}
                            {text.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivityClick(text.id);
                          }}
                        >
                          {activityType === "annotation" ? "Edit" : "Review"}
                        </Button>
                        {text.status === "progress" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelWork();
                            }}
                            disabled={cancelWorkMutation.isPending}
                            title="Delete your annotations and skip this text permanently"
                          >
                            {cancelWorkMutation.isPending
                              ? "Cancelling..."
                              : "Cancel & Skip"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent activity yet.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Start working to see your activity here!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onUploadComplete={handleBulkUploadComplete}
      />
    </div>
  );
};

export default Dashboard;
