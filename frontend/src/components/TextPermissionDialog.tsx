import { useEffect, useMemo, useRef, useState } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { IoClose, IoMailOutline, IoSearch } from "react-icons/io5";

import type {
  TextPermissionResponse,
  UserResponse,
  UserRole,
} from "@/api/types";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/components/user-management/constants";
import { useSearchUsers } from "@/hooks";

type ShareableUser = {
  id: number;
  username: string;
  email?: string;
  full_name?: string;
  role?: UserRole;
};

type TextPermissionDialogProps = Readonly<{
  isOpen: boolean;
  textId: number;
  isSubmitting: boolean;
  isRevokingUserId?: number | null;
  existingPermissions: TextPermissionResponse[];
  onClose: () => void;
  onSubmit: (payload: {
    granteeUserId?: number;
    granteeIdentifier?: string;
    permission: "read" | "write";
  }) => void;
  onRevoke: (granteeUserId: number) => void;
}>;

/** Roles that may receive edit/annotate access on a document. */
const WRITE_CAPABLE_ROLES: ReadonlySet<UserRole> = new Set([
  "admin",
  "annotator",
  "reviewer",
]);

const canReceiveWriteAccess = (role?: UserRole) =>
  role != null && WRITE_CAPABLE_ROLES.has(role);

/** The admin users table shows usernames as "@name", so accept that form too. */
const normalizeIdentifier = (value: string) =>
  value.trim().replace(/^@+/, "").trim().toLowerCase();

export function TextPermissionDialog({
  isOpen,
  textId,
  isSubmitting,
  isRevokingUserId = null,
  existingPermissions,
  onClose,
  onSubmit,
  onRevoke,
}: TextPermissionDialogProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<ShareableUser | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<"read" | "write">("read");

  useEffect(() => {
    if (!isOpen) {
      setSearchValue("");
      setDebouncedQuery("");
      setSelectedUser(null);
      setSelectedPermission("read");
      return;
    }

    searchInputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = globalThis.setTimeout(() => {
      setDebouncedQuery(normalizeIdentifier(searchValue));
    }, 300);

    return () => globalThis.clearTimeout(timer);
  }, [isOpen, searchValue]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const {
    data: suggestions = [],
    isFetching,
    error,
  } = useSearchUsers(debouncedQuery.length >= 2 ? debouncedQuery : "", {
    text_id: textId,
    limit: 10,
  });

  const existingPermission = useMemo(() => {
    if (!selectedUser) return undefined;
    return existingPermissions.find(
      (entry) => entry.grantee_user_id === selectedUser.id
    );
  }, [existingPermissions, selectedUser]);
  const existingPermissionsList = useMemo(
    () =>
      [...existingPermissions].sort((first, second) => {
        const firstLabel =
          first.grantee?.email ||
          first.grantee?.full_name ||
          first.grantee?.username ||
          String(first.grantee_user_id);
        const secondLabel =
          second.grantee?.email ||
          second.grantee?.full_name ||
          second.grantee?.username ||
          String(second.grantee_user_id);
        return firstLabel.localeCompare(secondLabel);
      }),
    [existingPermissions]
  );

  const typedIdentifier = normalizeIdentifier(searchValue);

  // Typing a full address and pressing the button should work without clicking a suggestion.
  useEffect(() => {
    if (selectedUser || !typedIdentifier) return;
    const exactMatch = suggestions.find(
      (user) =>
        normalizeIdentifier(user.email ?? "") === typedIdentifier ||
        normalizeIdentifier(user.username) === typedIdentifier
    );
    if (exactMatch) {
      setSelectedUser(exactMatch);
      const existing = existingPermissions.find(
        (entry) => entry.grantee_user_id === exactMatch.id
      );
      const preferred = existing?.permission ?? "read";
      setSelectedPermission(
        preferred === "write" && !canReceiveWriteAccess(exactMatch.role)
          ? "read"
          : preferred
      );
    }
  }, [suggestions, typedIdentifier, selectedUser, existingPermissions]);

  const showSuggestions = typedIdentifier.length >= 2;
  let submitLabel = selectedPermission === "write" ? "Grant edit access" : "Grant view access";
  if (existingPermission) {
    submitLabel = "Update access";
  }
  if (isSubmitting) {
    submitLabel = "Saving...";
  }
  const permissionLabel = selectedPermission === "write" ? "edit" : "view";
  const selectedRoleBlocksWrite =
    selectedPermission === "write" &&
    selectedUser?.role != null &&
    !canReceiveWriteAccess(selectedUser.role);
  let selectedUserHelperText = `This user will be given ${permissionLabel} access to this text.`;
  if (selectedRoleBlocksWrite && selectedUser?.role) {
    selectedUserHelperText =
      `Cannot grant edit access: their role is ${ROLE_LABELS[selectedUser.role]}. ` +
      "Only annotators, reviewers, and admins can receive edit access. " +
      "Change their role first, or grant view-only access instead.";
  } else if (existingPermission) {
    const currentLabel =
      existingPermission.permission === "write" ? "edit" : "view";
    selectedUserHelperText =
      existingPermission.permission === selectedPermission
        ? `This user already has ${currentLabel} access.`
        : `This will change their access from ${currentLabel} to ${permissionLabel}.`;
  }

  const handleSelectUser = (user: UserResponse) => {
    setSelectedUser(user);
    setSearchValue(user.email || user.username);
    const existing = existingPermissions.find((entry) => entry.grantee_user_id === user.id);
    const preferred = existing?.permission ?? "read";
    setSelectedPermission(
      preferred === "write" && !canReceiveWriteAccess(user.role) ? "read" : preferred
    );
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setSelectedUser((currentSelectedUser) => {
      const matchesCurrentSelection =
        currentSelectedUser &&
        normalizeIdentifier(value) ===
          normalizeIdentifier(
            currentSelectedUser.email || currentSelectedUser.username
          );
      if (!matchesCurrentSelection) {
        setSelectedPermission("read");
      }
      return matchesCurrentSelection ? currentSelectedUser : null;
    });
  };

  const handleSubmit = () => {
    if (selectedRoleBlocksWrite) return;
    if (selectedUser) {
      onSubmit({ granteeUserId: selectedUser.id, permission: selectedPermission });
      return;
    }
    if (typedIdentifier) {
      onSubmit({
        granteeIdentifier: typedIdentifier,
        permission: selectedPermission,
      });
    }
  };

  const handleSelectExistingPermission = (entry: TextPermissionResponse) => {
    const user: ShareableUser = entry.grantee ?? {
      id: entry.grantee_user_id,
      username: `user-${entry.grantee_user_id}`,
      email: undefined,
      full_name: undefined,
    };
    setSelectedUser(user);
    setSearchValue(user.email || user.username);
    setSelectedPermission(entry.permission);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <dialog
        open
        aria-labelledby="share-permission-title"
        className="relative m-4 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-background p-0 text-left shadow-2xl"
      >
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 id="share-permission-title" className="text-lg font-semibold text-foreground">
              Share Text
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Grant view or edit access per person. Access is specific to this text only.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
            <IoClose className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">People with access</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Click a person to load their current permission, or revoke access in one click.
              </p>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
              {existingPermissionsList.length === 0 ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">
                  No one else has access yet.
                </div>
              ) : (
                existingPermissionsList.map((entry) => {
                  const isSelected = selectedUser?.id === entry.grantee_user_id;
                  const grantee = entry.grantee;
                  const displayName =
                    grantee?.full_name ||
                    grantee?.username ||
                    `User ${entry.grantee_user_id}`;
                  const displayEmail =
                    grantee?.email ||
                    grantee?.username ||
                    `User ${entry.grantee_user_id}`;
                  const permissionLabel =
                    entry.permission === "write" ? "Can edit" : "Can view";

                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 ${
                        isSelected ? "bg-accent/50" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectExistingPermission(entry)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium text-foreground">
                          {displayName}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {displayEmail}
                        </p>
                      </button>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {permissionLabel}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRevoke(entry.grantee_user_id)}
                        disabled={isSubmitting || isRevokingUserId === entry.grantee_user_id}
                        className="shrink-0"
                      >
                        {isRevokingUserId === entry.grantee_user_id ? "Revoking..." : "Revoke"}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Add people</h3>
            <label
              htmlFor="share-user-email"
              className="text-sm font-medium text-foreground"
            >
              Email address or username
            </label>
            <div className="relative">
              <IoSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="share-user-email"
                ref={searchInputRef}
                type="text"
                value={searchValue}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="e.g. name@gmail.com"
                className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Type the person&apos;s full email address (or their username, with or
              without the leading @), then pick view or edit access. They must have
              signed in to this tool at least once before you can share with them.
            </p>
          </div>

          {(selectedUser || typedIdentifier) && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Permission</p>
              <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => setSelectedPermission("read")}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                    selectedPermission === "read"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  View only
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPermission("write")}
                  disabled={
                    selectedUser?.role != null &&
                    !canReceiveWriteAccess(selectedUser.role)
                  }
                  title={
                    selectedUser?.role != null &&
                    !canReceiveWriteAccess(selectedUser.role)
                      ? `${ROLE_LABELS[selectedUser.role]} role cannot receive edit access`
                      : undefined
                  }
                  className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    selectedPermission === "write"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Can edit
                </button>
              </div>
              {selectedUser?.role != null &&
                !canReceiveWriteAccess(selectedUser.role) && (
                  <p className="text-xs text-amber-700">
                    Their role ({ROLE_LABELS[selectedUser.role]}) only allows
                    view access. Assign an annotator, reviewer, or admin role
                    before granting edit rights.
                  </p>
                )}
            </div>
          )}

          {selectedUser && (
            <div
              className={`rounded-lg border p-3 ${
                selectedRoleBlocksWrite
                  ? "border-amber-300 bg-amber-50"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <IoMailOutline className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {selectedUser.full_name || selectedUser.username}
                    {selectedUser.role && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({ROLE_LABELS[selectedUser.role]})
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {selectedUser.email || selectedUser.username}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      selectedRoleBlocksWrite
                        ? "text-amber-800"
                        : "text-muted-foreground"
                    }`}
                  >
                    {selectedUserHelperText}
                  </p>
                </div>
              </div>
            </div>
          )}

          {showSuggestions && (
            <div className="rounded-lg border border-border">
              <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Matching users
              </div>
              <div className="max-h-64 overflow-y-auto">
                {isFetching && (
                  <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
                    <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                    Searching users...
                  </div>
                )}

                {!isFetching && error instanceof Error && (
                  <div className="px-4 py-4 text-sm text-red-600">
                    {error.message}
                  </div>
                )}

                {!isFetching && !error && suggestions.length === 0 && debouncedQuery.length >= 2 && (
                  <div className="px-4 py-4 text-sm text-muted-foreground">
                    No matching users found. If you are sure the address is right,
                    you can still grant access &mdash; we will tell you if no
                    account exists for it yet.
                  </div>
                )}

                {!isFetching &&
                  suggestions.map((user) => {
                    const isSelected = selectedUser?.id === user.id;
                    const currentPermissionForUser = existingPermissions.find(
                      (entry) => entry.grantee_user_id === user.id
                    );

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className={`flex w-full items-start justify-between gap-3 border-b border-border px-4 py-3 text-left transition last:border-b-0 hover:bg-accent/60 ${
                          isSelected ? "bg-accent/80" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {user.full_name || user.username}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              ({ROLE_LABELS[user.role]})
                            </span>
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {user.email || user.username}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {!canReceiveWriteAccess(user.role) && (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">
                              View only role
                            </span>
                          )}
                          {currentPermissionForUser && (
                            <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                              {currentPermissionForUser.permission === "write"
                                ? "Can edit"
                                : "Can view"}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              (!selectedUser && !typedIdentifier) ||
              isSubmitting ||
              selectedRoleBlocksWrite
            }
          >
            {submitLabel}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
