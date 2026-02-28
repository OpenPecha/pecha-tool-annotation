import type { ValidationError } from "./types"

/**
 * API error thrown when a request fails (non-2xx response or network error).
 * Use `instanceof ApiError` for type narrowing and `status_code` for HTTP status.
 */
export class ApiError extends Error {
  detail: string

  constructor(
    message: string,
    public readonly status_code?: number
  ) {
    super(message)
    this.name = "ApiError"
    this.detail = message
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

/**
 * Returns a user-facing message from an unknown error.
 * Prefer using ApiError.detail or Error.message when the type is known.
 */
export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) return error.detail
  if (error instanceof Error) return error.message
  return "An unknown error occurred"
}

/**
 * Type guard for FastAPI validation errors (422 with detail array).
 */
export function isValidationError(
  error: unknown
): error is ValidationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    Array.isArray((error as ValidationError).detail)
  )
}
