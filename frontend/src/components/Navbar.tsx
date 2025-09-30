import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/use-auth-hook";
import ProfileArea from "./ProfileArea";

const Navbar = () => {
  const { login, isAuthenticated } = useAuth();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-2 flex justify-between items-center">
      <div className="flex gap-2">
        <Link
          to="/"
          className="flex items-center gap-3 font-semibold text-gray-500 hover:text-gray-700 transition capitalize"
        >
          <img
            alt="icon"
            src={'/favicon-32x32.png'}
            width={40}
            className=" object-contain"
          />
          <span className="text-2xl font-bold">MQM Annotator</span>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <ProfileArea />
        ) : (
          <Button
            onClick={() => login(false)}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-600 transition"
          >
            Login
          </Button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
