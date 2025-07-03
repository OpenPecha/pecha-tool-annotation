import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/use-auth-hook";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { textApi } from "@/api/text";
import { Loader2 } from "lucide-react";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoadingText, setIsLoadingText] = useState(false);

  // Mutation to fetch available texts for annotation
  const fetchAvailableTextMutation = useMutation({
    mutationFn: async () => {
      return textApi.getTextsForAnnotation({ limit: 1 });
    },
    onSuccess: (texts) => {
      if (texts.length > 0) {
        const assignedText = texts[0];
        toast({
          title: "✅ Text Assigned",
          description: `Starting work on: "${assignedText.title}"`,
        });
        navigate(`/task/${assignedText.id}`);
      } else {
        toast({
          title: "📋 No Available Texts",
          description:
            "No texts are currently available for annotation. Please check back later.",
        });
      }
      setIsLoadingText(false);
    },
    onError: (error) => {
      console.error("Error fetching available texts:", error);
      toast({
        title: "❌ Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to fetch available texts",
      });
      setIsLoadingText(false);
    },
  });

  const handleStartWork = () => {
    setIsLoadingText(true);
    fetchAvailableTextMutation.mutate();
  };

  const handleReviewWork = () => {
    // TODO: Implement similar functionality for review texts
    toast({
      title: "🚧 Coming Soon",
      description: "Review functionality will be implemented soon!",
    });
  };

  // Mock data for recent activity - replace with actual data from your API
  const recentActivity = [
    {
      id: 1,
      title: "Text Annotation #1",
      date: "2024-01-15",
      type: "annotation",
    },
    { id: 2, title: "Review Session #3", date: "2024-01-14", type: "review" },
    {
      id: 3,
      title: "Text Annotation #2",
      date: "2024-01-13",
      type: "annotation",
    },
  ];

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
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Start Working Card */}
          <Card
            className={`hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200 ${
              isLoadingText ? "opacity-75" : "cursor-pointer"
            }`}
            onClick={!isLoadingText ? handleStartWork : undefined}
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

          {/* Review Work Card */}
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
                Review and validate existing annotations from yourself or other
                contributors
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={handleReviewWork}
              >
                Start Reviewing
              </Button>
              <p className="text-sm text-gray-500 mt-3">
                Quality check annotations, approve or suggest improvements
              </p>
            </CardContent>
          </Card>
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
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          activity.type === "annotation"
                            ? "bg-blue-500"
                            : "bg-green-500"
                        }`}
                      ></div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500">{activity.date}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                ))}
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
              <div className="text-2xl font-bold text-blue-600 mb-1">12</div>
              <div className="text-sm text-gray-600">Texts Annotated</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600 mb-1">8</div>
              <div className="text-sm text-gray-600">Reviews Completed</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600 mb-1">45</div>
              <div className="text-sm text-gray-600">Total Annotations</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600 mb-1">92%</div>
              <div className="text-sm text-gray-600">Accuracy Rate</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
