import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { AdminManualUserCreate, UserResponse, UserRole } from "@/api/types";
import {
  useSearchUsers,
  useToggleUserStatus,
  useUpdateUser,
  useUpsertManualUser,
  useUsers,
} from "@/hooks";

import {
  JOINED_FILTER_DAYS,
  type JoinedFilter,
  type RoleFilter,
  type StatusFilter,
} from "./constants";
import { filterStaffUsers } from "./utils";

const SEARCH_DEBOUNCE_MS = 300;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function applyListFilters(
  users: UserResponse[],
  selectedRole: RoleFilter,
  selectedStatus: StatusFilter,
  selectedJoined: JoinedFilter
): UserResponse[] {
  let filtered = users;
  if (selectedRole !== "all") {
    filtered = filtered.filter((user) => user.role === selectedRole);
  }
  if (selectedStatus !== "all") {
    const wantActive = selectedStatus === "active";
    filtered = filtered.filter((user) => user.is_active === wantActive);
  }
  if (selectedJoined !== "all") {
    const cutoff = Date.now() - JOINED_FILTER_DAYS[selectedJoined] * MS_PER_DAY;
    filtered = filtered.filter(
      (user) => new Date(user.created_at).getTime() >= cutoff
    );
  }
  return filtered;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useUserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleFilter>("all");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
  const [selectedJoined, setSelectedJoined] = useState<JoinedFilter>("all");
  const [showDefaultUsers, setShowDefaultUsers] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  useEffect(() => {
    if (!showDefaultUsers && selectedRole === "user") {
      setSelectedRole("all");
    }
  }, [showDefaultUsers, selectedRole]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => globalThis.clearTimeout(timer);
  }, [searchQuery]);

  const isSearchActive = debouncedSearch.length > 0;

  const usersQuery = useUsers(
    {
      role: selectedRole === "all" ? undefined : selectedRole,
      exclude_role:
        !showDefaultUsers && selectedRole === "all" ? "user" : undefined,
      is_active:
        selectedStatus === "all" ? undefined : selectedStatus === "active",
    },
    { enabled: !isSearchActive }
  );

  const searchQueryResult = useSearchUsers(debouncedSearch);

  const updateUserMutation = useUpdateUser();
  const toggleUserStatusMutation = useToggleUserStatus();
  const upsertManualUserMutation = useUpsertManualUser();

  const displayUsers = useMemo(() => {
    const raw = isSearchActive
      ? (searchQueryResult.data ?? [])
      : (usersQuery.data ?? []);
    const list = showDefaultUsers ? raw : filterStaffUsers(raw);
    return applyListFilters(list, selectedRole, selectedStatus, selectedJoined);
  }, [
    isSearchActive,
    searchQueryResult.data,
    usersQuery.data,
    showDefaultUsers,
    selectedRole,
    selectedStatus,
    selectedJoined,
  ]);

  const isListLoading = isSearchActive
    ? searchQueryResult.isLoading
    : usersQuery.isLoading;

  const listError = isSearchActive ? searchQueryResult.error : usersQuery.error;

  const handleRoleChange = (userId: number, newRole: UserRole) => {
    updateUserMutation.mutate(
      { userId, userData: { role: newRole } },
      {
        onSuccess: (updatedUser) => {
          toast.success("User updated", {
            description: `${updatedUser.username} is now ${updatedUser.role}.`,
          });
        },
        onError: (error) => {
          toast.error("Update failed", {
            description: getErrorMessage(error, "Could not update user role."),
          });
        },
      }
    );
  };

  const handleStatusToggle = (userId: number, currentStatus: boolean) => {
    toggleUserStatusMutation.mutate(
      { userId, isActive: !currentStatus },
      {
        onSuccess: (updatedUser) => {
          const action = updatedUser.is_active ? "activated" : "deactivated";
          toast.success("Status updated", {
            description: `${updatedUser.username} was ${action}.`,
          });
        },
        onError: (error) => {
          toast.error("Status update failed", {
            description: getErrorMessage(error, "Could not update user status."),
          });
        },
      }
    );
  };

  const isUpdatingRole = (userId: number) =>
    updateUserMutation.isPending &&
    updateUserMutation.variables?.userId === userId;

  const isUpdatingStatus = (userId: number) =>
    toggleUserStatusMutation.isPending &&
    toggleUserStatusMutation.variables?.userId === userId;

  const handleAddUser = (data: AdminManualUserCreate) => {
    upsertManualUserMutation.mutate(data, {
      onSuccess: (result) => {
        const action = result.created ? "created" : "updated";
        toast.success(`User ${action}`, {
          description: result.created
            ? `${result.full_name || result.username} was added as ${result.role}.`
            : `${result.email} is now ${result.role} and active.`,
        });
        setIsAddUserOpen(false);
      },
      onError: (error) => {
        toast.error("Could not save user", {
          description: getErrorMessage(error, "Please check the form and try again."),
        });
      },
    });
  };

  return {
    isAddUserOpen,
    setIsAddUserOpen,
    handleAddUser,
    isAddingUser: upsertManualUserMutation.isPending,
    searchQuery,
    setSearchQuery,
    selectedRole,
    setSelectedRole,
    selectedStatus,
    setSelectedStatus,
    selectedJoined,
    setSelectedJoined,
    showDefaultUsers,
    setShowDefaultUsers,
    displayUsers,
    isListLoading,
    listError,
    handleRoleChange,
    handleStatusToggle,
    isUpdatingRole,
    isUpdatingStatus,
  };
}
