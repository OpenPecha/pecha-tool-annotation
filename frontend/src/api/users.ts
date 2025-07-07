import { apiClient } from "./utils";
import type { UserResponse, UserUpdate, UserFilters, UserStats } from "./types";

export const usersApi = {
  // Get current user info
  getCurrentUser: async (): Promise<UserResponse> => {
    return apiClient.get<UserResponse>("/users/me");
  },

  // Update current user info
  updateCurrentUser: async (userData: UserUpdate): Promise<UserResponse> => {
    return apiClient.put<UserResponse>("/users/me", userData);
  },

  // Get all users (admin only)
  getAllUsers: async (filters?: UserFilters): Promise<UserResponse[]> => {
    return apiClient.get<UserResponse[]>(
      "/users/",
      filters as Record<string, string | number | boolean | undefined>
    );
  },

  // Get user by ID (admin only)
  getUserById: async (userId: number): Promise<UserResponse> => {
    return apiClient.get<UserResponse>(`/users/${userId}`);
  },

  // Update user (admin only)
  updateUser: async (
    userId: number,
    userData: UserUpdate
  ): Promise<UserResponse> => {
    return apiClient.put<UserResponse>(`/users/${userId}`, userData);
  },

  // Delete user (admin only)
  deleteUser: async (userId: number): Promise<void> => {
    return apiClient.delete<void>(`/users/${userId}`);
  },

  // Search users (admin only)
  searchUsers: async (
    query: string,
    filters?: UserFilters
  ): Promise<UserResponse[]> => {
    return apiClient.get<UserResponse[]>("/users/search/", {
      q: query,
      ...filters,
    } as Record<string, string | number | boolean | undefined>);
  },

  // Get user statistics
  getUserStats: async (): Promise<UserStats> => {
    return apiClient.get<UserStats>("/users/stats");
  },
};
