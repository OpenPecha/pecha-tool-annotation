import { useContext } from "react";
import { AuthContext } from "./auth-context-provider";
import type { AuthContextType } from "./types";

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
