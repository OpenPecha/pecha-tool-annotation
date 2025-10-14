/**
 * Centralized Query Keys for React Query
 * 
 * This file contains all query key factories for consistent caching and invalidation
 * across the application.
 */

export const queryKeys = {
  // Annotation Lists
  annotationLists: {
    all: ["annotation-lists"] as const,
    types: ["annotation-list-types"] as const,
    byType: (type: string) => ["annotation-list", type] as const,
  },

  // Annotation Types
  annotationTypes: {
    all: ["annotation-types"] as const,
  },

  // Annotations
  annotations: {
    all: ["annotations"] as const,
    byText: (textId: string | number) => ["annotations-by-text", textId] as const,
  },

  // Texts
  texts: {
    all: ["texts"] as const,
    detail: (id: string | number) => ["text", id] as const,
  },

  // Users
  users: {
    all: ["users"] as const,
    search: (query: string) => ["users", "search", query] as const,
  },
} as const;

