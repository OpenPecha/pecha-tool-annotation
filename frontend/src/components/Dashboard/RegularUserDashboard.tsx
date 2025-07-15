import React, { useState } from "react";
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
import { textApi } from "@/api/text";
import { reviewApi } from "@/api/reviews";
import type { RecentActivityWithReviewCounts } from "@/api/types";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import BulkUploadModal from "../BulkUploadModal";
import type { BulkUploadResponse } from "@/api/bulk-upload";
import { AnnotatorReviewedWork } from "../AnnotatorReviewedWork";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Icon components
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

export const RegularUserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [isLoadingText, setIsLoadingText] = useState(false);

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
      let errorMessage = "Failed to start work";
      let errorTitle = "❌ Error";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "detail" in error) {
        const apiError = error as { detail: string; status_code?: number };
        errorMessage = apiError.detail || "Failed to start work";

        if (apiError.status_code === 404) {
          errorTitle = "📝 No Tasks Available";
          errorMessage =
            "No texts available for annotation at this time. Please contact your administrator to add more texts to the system.";
        }
      }

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

  // Fetch user's work in progress
  const { data: workInProgress = [] } = useQuery({
    queryKey: ["my-work-in-progress"],
    queryFn: () => textApi.getMyWorkInProgress(),
    refetchOnWindowFocus: false,
  });

  // Fetch recent activity data from API
  const { data: recentActivity = [], isLoading: isLoadingActivity } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: () => textApi.getRecentActivity(10),
    refetchOnWindowFocus: false,
  });

  const handleStartWork = () => {
    setIsLoadingText(true);
    startWorkMutation.mutate();
  };

  const handleReviewWork = async () => {
    try {
      const textsForReview = await reviewApi.getTextsForReview({ limit: 1 });

      if (textsForReview.length === 0) {
        toast.info("📝 No Reviews Available", {
          description: "No texts are ready for review at this time.",
        });
        return;
      }

      const firstText = textsForReview[0];
      toast.success("Starting Review", {
        description: `Starting review for: "${firstText.title}"`,
      });

      navigate(`/review/${firstText.id}`);
    } catch (error) {
      toast.error("Failed to start review", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const handleBulkUpload = () => {
    setShowBulkUploadModal(true);
  };

  const handleBulkUploadComplete = (result: BulkUploadResponse) => {
    if (result.success) {
      toast.success("Bulk upload completed successfully!", {
        description: `${result.summary.total_texts_created} texts and ${result.summary.total_annotations_created} annotations created`,
      });
    }
    setShowBulkUploadModal(false);
  };

  // Helper function to determine activity type
  const getActivityType = (activity: RecentActivityWithReviewCounts) => {
    if (activity.text.reviewer_id === currentUser?.id) {
      return "review";
    }
    return "annotation";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8 pt-24">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome, {currentUser?.name}!
          </h1>
          <p className="text-gray-600">
            Create annotations, review work, and contribute to the knowledge
            base
          </p>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Start Work Card - Hide from reviewers */}
          {currentUser?.role !== "reviewer" && (
            <Card className="hover:shadow-lg  transition-all duration-300 cursor-pointer border-2 hover:border-blue-200">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <StartWorkIcon />
                </div>
                <CardTitle className="text-2xl">Start Work</CardTitle>
                <CardDescription className="text-base">
                  Begin annotating texts and creating structured content
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                {workInProgress.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Work in Progress</h3>
                      {workInProgress.map((text) => (
                        <div
                          key={text.id}
                          className="bg-white p-3 rounded border"
                        >
                          <div className="text-left">
                            <p className="font-medium text-gray-900">
                              {text.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              Status: {text.status} • Started:{" "}
                              {formatDate(text.updated_at || text.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="lg"
                        className="flex-1 cursor-pointer"
                        onClick={() =>
                          navigate(`/task/${workInProgress[0].id}`)
                        }
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleStartWork}
                      disabled={isLoadingText}
                    >
                      {isLoadingText ? (
                        <>
                          <AiOutlineLoading3Quarters className="w-4 h-4 mr-2 animate-spin" />
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

        {/* Review Progress Section - Show for reviewers and admins */}
        {(currentUser?.role === "reviewer" ||
          currentUser?.role === "admin") && (
          <div className="mb-8">
            <ReviewProgressSection />
          </div>
        )}

        {/* Reviewed Work Section - Hide from annotators */}
        {currentUser?.role !== "annotator" && (
          <div className="mb-8">
            <AnnotatorReviewedWork />
          </div>
        )}

        {/* Recent Activity Section - Hide from reviewers */}
        {currentUser?.role !== "reviewer" && (
          <Card className="w-full mx-auto">
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
              {isLoadingActivity && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading recent activity...</p>
                </div>
              )}
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity) => {
                    const activityType = getActivityType(activity);
                    return (
                      <RecentActivityItem
                        key={activity.text.id}
                        activity={activity}
                        activityType={activityType}
                      />
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
        )}
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

function RecentActivityItem({
  activity,
  activityType,
}: {
  readonly activity: RecentActivityWithReviewCounts;
  readonly activityType: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Handle clicking on recent activity item
  const handleActivityClick = (textId: number) => {
    // Only allow editing if not all annotations are accepted
    if (activity.all_accepted) {
      navigate(`/task/${textId}`); // View only
    } else {
      navigate(`/task/${textId}`); // Edit allowed
    }
  };

  // Mutation to cancel work (delete user annotations and skip text)
  const cancelWorkMutation = useMutation({
    mutationFn: async () => {
      const workInProgress = await textApi.getMyWorkInProgress();
      if (workInProgress.length === 0) {
        throw new Error("No work in progress found");
      }

      const currentTextId = workInProgress[0].id;
      return textApi.cancelWorkWithRevertAndSkip(currentTextId);
    },
    onSuccess: () => {
      toast.success("✅ Work Cancelled & Skipped", {
        description:
          "Your annotations were deleted and text was skipped. It won't be shown to you again.",
      });
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
  return (
    <div
      key={activity.text.id}
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${
            activityType === "annotation" ? "bg-blue-500" : "bg-green-500"
          }`}
        ></div>
        <div className="flex-1">
          <p className="font-medium text-gray-900">{activity.text.title}</p>
          <p className="text-sm text-gray-500">
            {formatDate(activity.text.updated_at || activity.text.created_at)} •{" "}
            {activity.text.status}
          </p>
          {activity.total_annotations > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                ✓ {activity.accepted_count}
              </span>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                ✗ {activity.rejected_count}
              </span>
              <span className="text-xs text-gray-500">
                {activity.total_annotations} total
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          className="cursor-pointer"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleActivityClick(activity.text.id);
          }}
          disabled={activity.all_accepted && activityType === "annotation"}
        >
          {activity.all_accepted && activityType === "annotation"
            ? "View"
            : activityType === "annotation"
            ? "Edit"
            : "Review"}
        </Button>
        {activity.text.status === "progress" && (
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
            {cancelWorkMutation.isPending ? "Cancelling..." : "Cancel & Skip"}
          </Button>
        )}
      </div>
    </div>
  );
}

// Review Progress Section Component
function ReviewProgressSection() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Fetch reviewer's work in progress
  const { data: reviewProgress = [], isLoading: isLoadingProgress } = useQuery({
    queryKey: ["my-review-progress"],
    queryFn: () => reviewApi.getMyReviewProgress(),
    refetchOnWindowFocus: false,
    enabled: currentUser?.role === "reviewer" || currentUser?.role === "admin",
  });

  if (isLoadingProgress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Review Progress</CardTitle>
          <CardDescription>
            Texts currently assigned to you for review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AiOutlineLoading3Quarters className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-500">Loading review progress...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reviewProgress.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Review Progress</CardTitle>
          <CardDescription>
            Texts currently assigned to you for review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No texts assigned for review yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Start reviewing texts to see your progress here!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Review Progress</CardTitle>
        <CardDescription>
          Texts currently assigned to you for review ({reviewProgress.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reviewProgress.map((text) => (
            <div
              key={text.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{text.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {text.reviewed_count} of {text.annotation_count}{" "}
                      annotations reviewed
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${text.progress_percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 min-w-[3rem]">
                      {text.progress_percentage}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {text.is_complete && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Complete
                  </span>
                )}
                <Button
                  size="sm"
                  variant={text.is_complete ? "outline" : "default"}
                  onClick={() => navigate(`/review/${text.id}`)}
                >
                  {text.is_complete ? "View" : "Continue"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
