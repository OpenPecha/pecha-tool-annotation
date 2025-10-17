import Navbar from "@/components/Navbar";

/**
 * Loading state component for Task page
 * Displays a centered spinner with loading message
 */
export const TaskLoadingState = () => {
  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading text...</p>
        </div>
      </div>
    </div>
  );
};

