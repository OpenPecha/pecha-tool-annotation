import React, {
  useState,
  useMemo,
  useCallback,
  createContext,
  useEffect,
} from "react";
import type { ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import type { AuthContextType } from "./types";
import { usersApi } from "../api/users";
import { clearUmamiUser, setUmamiUser } from "@/analytics";

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

type UserType = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  role?: string;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Auth0 hook
  const {
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently,
    loginWithRedirect,
    logout: auth0Logout,
    error,
  } = useAuth0();

  // State for backend user data
  const [backendUser, setBackendUser] = useState<UserType | null>(null);
  const [fetchingBackendUser, setFetchingBackendUser] = useState(false);

  const logout = useCallback(() => {
    // Clear backend user data
    setBackendUser(null);
    setFetchingBackendUser(false);

    // Clear stored auth token
    localStorage.removeItem("auth_token");

    // If using Auth0, use their logout function
    auth0Logout({
      logoutParams: { returnTo: window.location.origin },
      clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
    });
  }, [auth0Logout]);

  const getToken = useCallback(async (): Promise<string | null> => {
    // If using Auth0, get token from Auth0
    try {
      const access_token = await getAccessTokenSilently();
      // Store token in localStorage for API utils to access
      if (access_token) {
        localStorage.setItem("auth_token", access_token);
      }
      return access_token;
    } catch (error) {
      console.error("Error getting Auth0 token:", error);
      return null;
    }
  }, [getAccessTokenSilently]);

  // Fetch backend user data and store auth token when Auth0 user is available
  useEffect(() => {
    const fetchBackendUser = async () => {
      if (isAuthenticated && user && !fetchingBackendUser && !backendUser) {
        setFetchingBackendUser(true);
        try {
          // Get and store Auth0 token for API calls
          const token = await getAccessTokenSilently();
          if (token) {
            localStorage.setItem("auth_token", token);
          }

          const userData = await usersApi.getCurrentUser();
          setBackendUser({
            id: userData.id.toString(),
            email: userData.email,
            name: userData.full_name || user.name,
            picture: user.picture,
            role: userData.role,
          });
        } catch (error) {
          console.error("Error fetching backend user:", error);
          // Fallback to Auth0 data if backend fetch fails
          setBackendUser({
            id: user.sub || "",
            email: user.email || "",
            name: user.name,
            picture: user.picture,
          });
        } finally {
          setFetchingBackendUser(false);
        }
      }
    };

    fetchBackendUser();
  }, [
    isAuthenticated,
    user,
    fetchingBackendUser,
    backendUser,
    getAccessTokenSilently,
  ]);

  // Use backend user data if available, otherwise use Auth0 data
  const currentUser: UserType | null =
    backendUser ||
    (user
      ? {
          id: user.sub || "",
          email: user.email || "",
          name: user.name,
          picture: user.picture,
        }
      : null);
  // Track silent auth attempts to prevent infinite loops
  const [silentAuthAttempted, setSilentAuthAttempted] = useState(false);

 useEffect(() => {
    if (isAuthenticated && user) {
      // Set user for Umami identification
      setUmamiUser({
        email: user.email,
        id: user.id,
        name: user.name,
        // Add additional properties if available
        sub: user?.sub,
      });
    } else if (!isAuthenticated) {
      // Clear user identification when logged out
      clearUmamiUser();
    }
  }, [isAuthenticated,  user]);


  const login = useCallback(
    (auto: boolean) => {
      console.log("login", auto);
      // If this is a silent auth attempt (auto=true)
      if (auto) {
        // If we've already tried silent auth and it failed, don't try again
        if (silentAuthAttempted) {
          console.log(
            "Silent authentication already attempted, not retrying to prevent loop"
          );
          return;
        }

        // Mark that we've attempted silent auth
        setSilentAuthAttempted(true);
      } else {
        // If this is an explicit login, reset the silent auth flag
        setSilentAuthAttempted(false);
      }

      loginWithRedirect({
        authorizationParams: {
          prompt: auto ? "none" : "login",
        },
      });
    },
    [loginWithRedirect, silentAuthAttempted]
  );
  // Convert error to string | null to match AuthContextType
  const errorMessage = error ? error.message || "Authentication error" : null;

  // Use useMemo to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      currentUser,
      login,
      logout,
      getToken,
      error: errorMessage,
    }),
    [
      isAuthenticated,
      isLoading,
      currentUser,
      login,
      logout,
      getToken,
      errorMessage,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
