import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";
import BulkUploadModal from "@/components/BulkUploadModal";
import type { BulkUploadResponse } from "@/api/bulk-upload";

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
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);

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
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {currentUser?.name || "User"}!
          </h1>
          <p className="text-gray-600">
            Choose an option below to start working on your Pecha annotation
            tasks.
          </p>
        </div>

        {/* Main Action Cards */}
        <div
          className="grid gap-6 mb-8"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          {/* Start Working Card - Show for annotators, users without role, or admins */}
          {(!currentUser?.role ||
            currentUser.role === "annotator" ||
            currentUser.role === "admin") && (
            <Card
              className={`hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200 ${
                isLoadingText ? "opacity-75" : ""
              }`}
            >
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <StartWorkIcon />
                </div>
                <CardTitle className="text-2xl">Start Working</CardTitle>
                <CardDescription className="text-base">
                  Begin annotating new texts or continue working on existing
                  annotations
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
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
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => handleActivityClick(text.id)}
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
                      <Button variant="ghost" size="sm">
                        {activityType === "annotation" ? "Edit" : "Review"}
                      </Button>
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

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              {isLoadingStats ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {userStats?.texts_annotated || 0}
                  </div>
                  <div className="text-sm text-gray-600">Texts Annotated</div>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              {isLoadingStats ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {userStats?.reviews_completed || 0}
                  </div>
                  <div className="text-sm text-gray-600">Reviews Completed</div>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              {isLoadingStats ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {userStats?.total_annotations || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Annotations</div>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              {isLoadingStats ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {userStats?.accuracy_rate || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Accuracy Rate</div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
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
