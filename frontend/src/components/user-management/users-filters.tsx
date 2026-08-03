import { IoSearch } from "react-icons/io5";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  JOINED_FILTER_LABELS,
  ROLE_LABELS,
  STAFF_FILTER_ROLES,
  type JoinedFilter,
  type RoleFilter,
  type StatusFilter,
} from "./constants";

const selectClassName = cn(
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
);

type UsersFiltersProps = Readonly<{
  searchQuery: string;
  selectedRole: RoleFilter;
  selectedStatus: StatusFilter;
  selectedJoined: JoinedFilter;
  showDefaultUsers: boolean;
  onSearchChange: (value: string) => void;
  onRoleChange: (role: RoleFilter) => void;
  onStatusChange: (status: StatusFilter) => void;
  onJoinedChange: (joined: JoinedFilter) => void;
  onShowDefaultUsersChange: (show: boolean) => void;
}>;

export function UsersFilters({
  searchQuery,
  selectedRole,
  selectedStatus,
  selectedJoined,
  showDefaultUsers,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onJoinedChange,
  onShowDefaultUsersChange,
}: UsersFiltersProps) {
  const roleOptions = showDefaultUsers
    ? [...STAFF_FILTER_ROLES, "user" as const]
    : STAFF_FILTER_ROLES;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row">
      <div className="relative flex-1">
        <IoSearch
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Search by username, email, or name…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            selectClassName,
            "pl-10",
            "placeholder:text-muted-foreground"
          )}
          aria-label="Search users"
        />
      </div>
      <select
        value={selectedRole}
        onChange={(e) => onRoleChange(e.target.value as RoleFilter)}
        className={cn(selectClassName, "md:w-44")}
        aria-label="Filter by role"
      >
        <option value="all">
          {showDefaultUsers ? "All roles" : "All staff roles"}
        </option>
        {roleOptions.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      <select
        value={selectedStatus}
        onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
        className={cn(selectClassName, "md:w-40")}
        aria-label="Filter by status"
      >
        <option value="all">All status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <select
        value={selectedJoined}
        onChange={(e) => onJoinedChange(e.target.value as JoinedFilter)}
        className={cn(selectClassName, "md:w-44")}
        aria-label="Filter by join date"
      >
        {(Object.keys(JOINED_FILTER_LABELS) as JoinedFilter[]).map((key) => (
          <option key={key} value={key}>
            {JOINED_FILTER_LABELS[key]}
          </option>
        ))}
      </select>
      </div>

      <div>
        <Button
          type="button"
          size="sm"
          variant={showDefaultUsers ? "default" : "outline"}
          onClick={() => onShowDefaultUsersChange(!showDefaultUsers)}
          aria-pressed={showDefaultUsers}
        >
          {showDefaultUsers ? "Hide regular users" : "Show regular users"}
        </Button>
      </div>
    </div>
  );
}
