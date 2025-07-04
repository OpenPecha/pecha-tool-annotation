export type User = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  role?: string;
};

export type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentUser: User | null;
  login: (auto: boolean) => void;
  logout: () => void;
  getToken: () => Promise<string | null>;
  error: string | null;
};
