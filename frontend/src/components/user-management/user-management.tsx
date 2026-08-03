import { IoAdd, IoPeople } from "react-icons/io5";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

import { AddUserDialog } from "./add-user-dialog";
import { UsersFilters } from "./users-filters";
import { UsersTable } from "./users-table";
import { useUserManagement } from "./use-user-management";

type UserManagementProps = Readonly<{ className?: string }>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function UserManagement({ className }: UserManagementProps) {
  const {
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
    isAddUserOpen,
    setIsAddUserOpen,
    handleAddUser,
    isAddingUser,
  } = useUserManagement();

  if (listError) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-center text-sm text-destructive">
            Could not load users: {getErrorMessage(listError)}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section
      className={cn("flex h-full min-h-0 flex-col p-4", className)}
      aria-labelledby="user-management-heading"
    >
      <header className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <IoPeople className="h-5 w-5" aria-hidden />
            <h2
              id="user-management-heading"
              className="text-lg font-semibold"
            >
              User Management
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Admin, reviewer, and annotator accounts are listed by default.
            Use the toggle below to include regular user accounts.
          </p>
        </div>
        <Button type="button" onClick={() => setIsAddUserOpen(true)}>
          <IoAdd className="mr-2 h-4 w-4" aria-hidden />
          Add user
        </Button>
      </header>

      <AddUserDialog
        isOpen={isAddUserOpen}
        isSubmitting={isAddingUser}
        onClose={() => setIsAddUserOpen(false)}
        onSubmit={handleAddUser}
      />

      <div className="shrink-0">
        <UsersFilters
          searchQuery={searchQuery}
          selectedRole={selectedRole}
          selectedStatus={selectedStatus}
          selectedJoined={selectedJoined}
          showDefaultUsers={showDefaultUsers}
          onSearchChange={setSearchQuery}
          onRoleChange={setSelectedRole}
          onStatusChange={setSelectedStatus}
          onJoinedChange={setSelectedJoined}
          onShowDefaultUsersChange={setShowDefaultUsers}
        />
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
        {isListLoading ? (
          <Loading message="Loading users…" />
        ) : (
          <UsersTable
            users={displayUsers}
            isUpdatingRole={isUpdatingRole}
            isUpdatingStatus={isUpdatingStatus}
            onRoleChange={handleRoleChange}
            onStatusToggle={handleStatusToggle}
          />
        )}
      </div>
    </section>
  );
}
