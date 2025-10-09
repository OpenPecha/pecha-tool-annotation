import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  IoSearch,
  IoPeople,
  IoShieldCheckmark,
  IoEye,
  IoCreateOutline,
  IoTrash,
} from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { usersApi } from "@/api/users";
import type { UserRole } from "@/api/types";
import { useAuth } from "@/auth/use-auth-hook";

interface UserManagementProps {
  className?: string;
}

export function UserManagement({ className }: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  // Fetch users
  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users", selectedRole, selectedStatus],
    queryFn: () =>
      usersApi.getAllUsers({
        role: selectedRole === "all" ? undefined : selectedRole,
        is_active:
          selectedStatus === "all" ? undefined : selectedStatus === "active",
      }),
  });

  // Search users
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["users-search", searchQuery],
    queryFn: () => usersApi.searchUsers(searchQuery),
    enabled: searchQuery.length > 0,
  });

  // Update user role mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: number;
      role: UserRole;
    }) => {
      return usersApi.updateUser(userId, { role });
    },
    onSuccess: (updatedUser) => {
      toast.success("✅ User Updated", {
        description: `Successfully updated ${updatedUser.username}'s role to ${updatedUser.role}`,
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error("❌ Update Failed", {
        description:
          error instanceof Error ? error.message : "Failed to update user role",
      });
    },
  });

  // Toggle user status mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({
      userId,
      isActive,
    }: {
      userId: number;
      isActive: boolean;
    }) => {
      return usersApi.updateUser(userId, { is_active: isActive });
    },
    onSuccess: (updatedUser) => {
      toast.success("✅ User Status Updated", {
        description: `Successfully ${
          updatedUser.is_active ? "activated" : "deactivated"
        } ${updatedUser.username}`,
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error("❌ Status Update Failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to update user status",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return usersApi.deleteUser(userId);
    },
    onSuccess: () => {
      toast.success("✅ User Deleted", {
        description: "User has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error("❌ Delete Failed", {
        description:
          error instanceof Error ? error.message : "Failed to delete user",
      });
    },
  });

  const handleRoleChange = (
    userId: number,
    newRole: UserRole,
    oldRole: UserRole
  ) => {
    updateUserMutation.mutate({ userId, role: newRole });
  };

  const handleStatusToggle = (userId: number, currentStatus: boolean) => {

    toggleUserStatusMutation.mutate({ userId, isActive: !currentStatus });
  };

  const handleDeleteUser = (userId: number) => {
    if (
      window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <IoShieldCheckmark className="w-4 h-4" />;
      case "reviewer":
        return <IoCreateOutline className="w-4 h-4" />;
      case "annotator":
        return <IoPeople className="w-4 h-4" />;
      case "user":
        return <IoEye className="w-4 h-4" />;
      default:
        return <IoEye className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "reviewer":
        return "bg-purple-100 text-purple-800";
      case "annotator":
        return "bg-blue-100 text-blue-800";
      case "user":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const displayUsers = searchQuery.length > 0 ? searchResults : users;

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>
              Error loading users:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IoPeople className="w-5 h-5" />
          User Management
        </CardTitle>
        <CardDescription>
          Manage user accounts, roles, and permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <IoSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by username or email..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) =>
              setSelectedRole(e.target.value as UserRole | "all")
            }
            className="w-full md:w-40 pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="reviewer">Reviewer</option>
            <option value="annotator">Annotator</option>
            <option value="user">User</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value as "all" | "active" | "inactive")
            }
            className="w-full md:w-40 pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Users List */}
        {isLoading || isSearching ? (
          <div className="flex items-center justify-center py-8">
            <AiOutlineLoading3Quarters className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-blue-600">Loading users...</span>
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <IoPeople className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(user.role)}
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.full_name || user.username}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.email} • ID: {user.id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRoleColor(user.role)}>
                      {user.role}
                    </Badge>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={user.role}
                    onChange={(e) =>
                      handleRoleChange(
                        user.id,
                        e.target.value as UserRole,
                        user.role
                      )
                    }
                    disabled={updateUserMutation.isPending}
                    className="w-32 pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="admin">Admin</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="annotator">Annotator</option>
                    <option value="user">User</option>
                  </select>
                  <Button
                    size="sm"
                    variant={user.is_active ? "destructive" : "outline"}
                    onClick={() => handleStatusToggle(user.id, user.is_active)}
                    disabled={toggleUserStatusMutation.isPending}
                  >
                    {user.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={deleteUserMutation.isPending}
                  >
                    <IoTrash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
