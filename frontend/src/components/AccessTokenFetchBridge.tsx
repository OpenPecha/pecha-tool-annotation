import { useAuth0 } from "@auth0/auth0-react"
import { useEffect } from "react"
import { setAccessTokenGetter } from "@/lib/fetchWithAccessToken"
import { useRequireLogin } from "@/hooks/useRequireLogin"

/**
 * Registers the Auth0 token resolver (and the 401 refresh / re-login handling) for
 * `fetchWithAccessToken`. Mount once under `Auth0Provider`.
 */
export function AccessTokenFetchBridge() {
  const { isLoading, isAuthenticated, getAccessTokenSilently } = useAuth0()
  const requireLogin = useRequireLogin()

  useEffect(() => {
    // Keep any previous registration while Auth0 restores the session, otherwise
    // in-flight requests would go out unauthenticated and 401.
    if (isLoading) return

    const resolveToken = async (): Promise<string | null> => {
      if (!isAuthenticated) return null
      try {
        const token = await getAccessTokenSilently()
        return token ?? null
      } catch {
        return null
      }
    }

    const refreshToken = async (): Promise<void> => {
      if (!isAuthenticated) throw new Error("No Auth0 session to refresh")
      await getAccessTokenSilently({ cacheMode: "off" })
    }

    setAccessTokenGetter(resolveToken, {
      refreshToken,
      onUnauthenticated: requireLogin,
    })

    return () => {
      setAccessTokenGetter(null)
    }
  }, [isLoading, isAuthenticated, getAccessTokenSilently, requireLogin])

  return null
}
