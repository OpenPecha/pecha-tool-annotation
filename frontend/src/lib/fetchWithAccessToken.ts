export type AccessTokenExtras = {
  /** Force a fresh token (e.g. Auth0 `getAccessTokenSilently({ cacheMode: 'off' })`). */
  refreshToken?: () => Promise<void>
  /** Called when refresh fails or a retried request still returns 401; should send the user through login again. */
  onUnauthenticated?: () => void
}

let resolveToken: (() => Promise<string | null>) | null = null
let registeredExtras: AccessTokenExtras | undefined

/**
 * Register how to obtain a Bearer token for API `fetch` calls, or clear registration.
 * Typically called once from a bridge component under `Auth0Provider`.
 */
export function setAccessTokenGetter(
  getter: (() => Promise<string | null>) | null,
  extras?: AccessTokenExtras
): void {
  resolveToken = getter
  registeredExtras = extras
}

export async function getRegisteredAccessToken(): Promise<string | null> {
  if (!resolveToken) return null
  try {
    return await resolveToken()
  } catch {
    return null
  }
}

async function fetchOnce(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers ?? undefined)
  if (resolveToken) {
    try {
      const token = await resolveToken()
      if (token) headers.set("Authorization", `Bearer ${token}`)
    } catch {
      // omit Authorization
    }
  }
  return fetch(input, { ...init, headers })
}

/**
 * `fetch` that merges headers and adds `Authorization` when a getter is registered.
 * On 401 it refreshes the token once and retries; if that still fails, `onUnauthenticated`
 * is invoked so the user is asked to log in again instead of being left on a loading state.
 */
export async function fetchWithAccessToken(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let response = await fetchOnce(input, init)

  if (response.status !== 401) return response

  if (registeredExtras?.refreshToken) {
    try {
      await registeredExtras.refreshToken()
      response = await fetchOnce(input, init)
      if (response.status !== 401) return response
    } catch {
      // Session can't be recovered silently; fall through to re-login.
    }
  }

  registeredExtras?.onUnauthenticated?.()

  return response
}

/** Alias for a second base URL; same behavior as `fetchWithAccessToken`. */
export const outlinerFetch = fetchWithAccessToken
