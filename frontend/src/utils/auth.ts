import { useContext } from "react";
import { AuthContext } from "@/auth/auth-context";
import { getAccessToken } from "@/lib/auth";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Gets auth token. Uses Auth0 getAccessTokenSilently (triggers refresh when expired).
 * Prefer useAuth().getToken() from React components.
 */
export const getAuthToken = async (): Promise<string> => {
  const token = await getAccessToken();
  if (token) return token;

  const cached = typeof window !== "undefined" && localStorage.getItem("auth_token");
  if (cached) return cached;

  throw new Error("No authentication token available");
};
