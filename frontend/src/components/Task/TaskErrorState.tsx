import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";

interface TaskErrorStateProps {
  error: Error | null;
}

/**
 * Error state component for Task page
 * Displays error message with option to return to dashboard
 */
export const TaskErrorState = ({ error }: TaskErrorStateProps) => {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Text
          </h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : "Failed to load text"}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

