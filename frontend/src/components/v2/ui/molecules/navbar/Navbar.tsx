import { Link } from "react-router-dom"
import { useAuth } from "@/auth/use-auth-hook"
import { Button } from "@/components/ui/button"

function Navbar() {
  const { login, isAuthenticated } = useAuth()

  return (
    <nav className="z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          <img
            alt="Buddhist AI"
            src="/favicon-32x32.png"
            width={32}
            height={32}
            className="object-contain"
          />
          <span className="text-xl font-bold">Buddhistai Translation Tool</span>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" asChild>
          <a
            href="https://buddhistai.tools"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            buddhistai.tools
          </a>
        </Button>
        {isAuthenticated ? (
          <Button variant="default" asChild>
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        ) : (
          <Button variant="default" onClick={() => login(true)}>
            Login
          </Button>
        )}
      </div>
    </nav>
  )
}

export default Navbar
