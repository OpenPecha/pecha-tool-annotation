import type { ValidationError } from "./types";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:8000/v1";

type CustomHeaders = Record<string, string>;

// This is a synchronous function that returns the token from localStorage
// It's used as a fallback when we can't use the Auth0 hooks (outside of React components)
const getBaseHeaders = (): CustomHeaders => {
  // Try different token names that might be used in the application
  const token =
    localStorage.getItem("auth_token") ??
    localStorage.getItem("access_token") ??
    sessionStorage.getItem("auth_token") ??
    sessionStorage.getItem("access_token") ??
    "";

  return {
    Authorization: `Bearer ${token}`,
  };
};

// This is an async function that gets the token from Auth0
// It should be used when possible, but requires being in a React component context
export const getAuthToken = async (): Promise<string> => {
  try {
    // If we're in a browser environment with localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      // Check if we have a cached token
      const cachedToken = localStorage.getItem("auth_token");
      if (cachedToken) {
        return cachedToken;
      }
    }

    // If no cached token, we need to be in a component context to get it from Auth0
    throw new Error(
      "No authentication token available. Make sure you are logged in."
    );
  } catch (error) {
    console.error("Error getting auth token:", error);
    throw error;
  }
};

export const getHeaders = (): CustomHeaders => ({
  ...getBaseHeaders(),
  "Content-Type": "application/json",
});

export const getHeadersMultipart = (): CustomHeaders => getBaseHeaders();

// API client with error handling
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = getHeaders();

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.detail || `HTTP error! status: ${response.status}`,
          response.status
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    }
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const urlParams = params
      ? "?" +
        new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString()
      : "";

    return this.request<T>(`${endpoint}${urlParams}`, {
      method: "GET",
    });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
    });
  }
}

// Create the main API client instance
export const apiClient = new ApiClient(SERVER_URL);

// Error handling utilities
export const handleApiError = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.detail;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred";
};

export const isValidationError = (error: unknown): error is ValidationError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    Array.isArray((error as ValidationError).detail)
  );
};

// Create custom ApiError class
class ApiError extends Error {
  constructor(message: string, public status_code?: number) {
    super(message);
    this.name = "ApiError";
    this.detail = message;
  }

  detail: string;
}
