import type { UserRole } from "@/api/types";

export const USER_ROLES: UserRole[] = ["admin", "reviewer", "annotator", "viewer", "user"];

export const STAFF_FILTER_ROLES: UserRole[] = ["admin", "reviewer", "annotator", "viewer"];

export type StatusFilter = "all" | "active" | "inactive";

export type JoinedFilter = "all" | "1d" | "1w" | "1m";

export type RoleFilter = UserRole | "all";

export const JOINED_FILTER_LABELS: Record<JoinedFilter, string> = {
  all: "Any join date",
  "1d": "Within 1 day",
  "1w": "Within 1 week",
  "1m": "Within 1 month",
};

export const JOINED_FILTER_DAYS: Record<Exclude<JoinedFilter, "all">, number> = {
  "1d": 1,
  "1w": 7,
  "1m": 30,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  reviewer: "Reviewer",
  annotator: "Annotator",
  viewer: "Viewer",
  user: "User",
};
