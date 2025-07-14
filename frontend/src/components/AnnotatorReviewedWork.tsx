import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  reviewApi,
  type AnnotatorReviewedWork as AnnotatorReviewedWorkType,
  type TextNeedingRevision,
} from "@/api/reviews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  IoCheckmarkCircle as CheckCircle,
  IoCloseCircle as XCircle,
  IoEye as Eye,
  IoWarning as AlertTriangle,
  IoRefresh as RotateCcw,
  IoChatbubbleEllipses as MessageSquare,
} from "react-icons/io5";

interface AnnotatorReviewedWorkProps {
  className?: string;
}

export const AnnotatorReviewedWork: React.FC<AnnotatorReviewedWorkProps> = ({
  className,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"reviewed" | "needs-revision">(
    "reviewed"
  );

  // Fetch reviewed work
  const { data: reviewedWork, isLoading: isLoadingReviewed } = useQuery<
    AnnotatorReviewedWorkType[]
  >({
    queryKey: ["annotator-reviewed-work"],
    queryFn: () => reviewApi.getAnnotatorReviewedWork(),
    refetchOnWindowFocus: false,
  });

  // Fetch texts needing revision
  const { data: needsRevision, isLoading: isLoadingRevision } = useQuery<
    TextNeedingRevision[]
  >({
    queryKey: ["texts-needing-revision"],
    queryFn: () => reviewApi.getTextsNeedingRevision(),
    refetchOnWindowFocus: false,
  });

  const handleViewText = (textId: number) => {
    navigate(`/task/${textId}`);
  };

  const handleViewAnnotation = (textId: number, annotationId: number) => {
    navigate(`/task/${textId}?annotationId=${annotationId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reviewed":
        return "bg-green-100 text-green-800";
      case "reviewed_needs_revision":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderReviewedWork = () => {
    if (isLoadingReviewed) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading reviewed work...</span>
        </div>
      );
    }

    if (!reviewedWork || reviewedWork.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Eye className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No reviewed work found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {reviewedWork.map((work) => (
          <Card key={work.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{work.title}</CardTitle>
                <Badge className={getStatusColor(work.status)}>
                  {work.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Total annotations: {work.total_annotations}</span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  {work.agree_count} agreed
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  {work.disagree_count} disagreed
                </span>
                <span className="text-gray-500">
                  Reviewed: {new Date(work.reviewed_at).toLocaleDateString()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <h4 className="font-medium">Review Comments:</h4>
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {work.annotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className="p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {annotation.annotation_type}
                            </Badge>
                            <span className="text-sm font-medium">
                              "{annotation.selected_text}"
                            </span>
                          </div>
                          <Button
                            onClick={() =>
                              handleViewAnnotation(work.id, annotation.id)
                            }
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto"
                            title="Go to annotation"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                        {annotation.reviews.map((review) => (
                          <div
                            key={review.id}
                            className="ml-2 mt-2 p-2 bg-white rounded border-l-4 border-l-blue-200 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() =>
                              handleViewAnnotation(work.id, annotation.id)
                            }
                            title="Click to view this annotation in text"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {review.decision === "agree" ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                              <span className="text-sm font-medium">
                                {review.decision === "agree"
                                  ? "Agreed"
                                  : "Disagreed"}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(
                                  review.created_at
                                ).toLocaleDateString()}
                              </span>
                              <Eye className="w-3 h-3 text-gray-400 ml-auto" />
                            </div>
                            {review.comment && (
                              <p className="text-sm text-gray-700 mt-1">
                                {review.comment}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button
                  onClick={() => handleViewText(work.id)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Text
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderNeedsRevision = () => {
    if (isLoadingRevision) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
          <span className="ml-2">Loading texts needing revision...</span>
        </div>
      );
    }

    if (!needsRevision || needsRevision.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No texts need revision</p>
          <p className="text-sm">Great job! All your work has been approved.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {needsRevision.map((text) => (
          <Card
            key={text.id}
            className="border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{text.title}</CardTitle>
                <Badge className="bg-yellow-100 text-yellow-800">
                  Needs Revision
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Total annotations: {text.total_annotations}</span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  {text.disagree_count} disagreed
                </span>
                <span className="text-gray-500">
                  Reviewed: {new Date(text.reviewed_at).toLocaleDateString()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <h4 className="font-medium text-yellow-800 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Reviewer Comments:
                </h4>
                <div className="space-y-2">
                  {text.disagree_comments.map((comment, index) => (
                    <div
                      key={index}
                      className="p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                    >
                      <p className="text-sm text-gray-700">{comment}</p>
                    </div>
                  ))}
                  {text.disagree_comments.length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      No specific comments provided
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => handleViewText(text.id)}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Revise Work
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          My Reviewed Work
        </h2>
        <p className="text-gray-600">
          View feedback from reviewers and texts that need revision
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("reviewed")}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === "reviewed"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" />
            Reviewed Work
            {reviewedWork && (
              <Badge variant="secondary" className="ml-2">
                {reviewedWork.length}
              </Badge>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("needs-revision")}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === "needs-revision"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Needs Revision
            {needsRevision && (
              <Badge
                variant="secondary"
                className={`ml-2 ${
                  needsRevision.length > 0
                    ? "bg-yellow-100 text-yellow-800"
                    : ""
                }`}
              >
                {needsRevision.length}
              </Badge>
            )}
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "reviewed"
          ? renderReviewedWork()
          : renderNeedsRevision()}
      </div>
    </div>
  );
};
