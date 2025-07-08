import React from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = "md",
  message = "Loading...",
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <div className="text-center">
        <AiOutlineLoading3Quarters
          className={`${sizeClasses[size]} animate-spin text-blue-600 mx-auto mb-2`}
        />
        <p className={`text-blue-600 ${textSizeClasses[size]}`}>{message}</p>
      </div>
    </div>
  );
};

export const FullScreenLoading: React.FC<{ message?: string }> = ({
  message = "Loading Dashboard...",
}) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-16 flex items-center justify-center">
    <Loading size="lg" message={message} />
  </div>
);

// Re-export AppLoading for convenience
export { AppLoading } from "./app-loading";
