import { apiClient } from "./utils";
import type {
  UserResponse,
  UserUpdate,
  UserFilters,
  SearchParams,
} from "./types";

// Users API client
export const usersApi = {
  // Get current user info
  getCurrentUser: async (): Promise<UserResponse> => {
    return apiClient.get<UserResponse>("/users/me");
  },

  // Update current user info
  updateCurrentUser: async (data: UserUpdate): Promise<UserResponse> => {
    return apiClient.put<UserResponse>("/users/me", data);
  },

  // Get all users (Admin only)
  getUsers: async (filters: UserFilters = {}): Promise<UserResponse[]> => {
    return apiClient.get<UserResponse[]>("/users", filters);
  },

  // Get single user by ID (Admin only)
  getUser: async (id: number): Promise<UserResponse> => {
    return apiClient.get<UserResponse>(`/users/${id}`);
  },

  // Update user (Admin only)
  updateUser: async (id: number, data: UserUpdate): Promise<UserResponse> => {
    return apiClient.put<UserResponse>(`/users/${id}`, data);
  },

  // Delete user (Admin only)
  deleteUser: async (id: number): Promise<void> => {
    return apiClient.delete<void>(`/users/${id}`);
  },

  // Search users (Admin only)
  searchUsers: async (params: SearchParams): Promise<UserResponse[]> => {
    return apiClient.get<UserResponse[]>("/users/search", params);
  },
};
