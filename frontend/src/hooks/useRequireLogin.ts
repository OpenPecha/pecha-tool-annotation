import { useAuth0 } from "@auth0/auth0-react"
import { useCallback } from "react"

// Module scope so concurrent 401s from several queries only start one redirect.
let redirectInFlight = false

/**
 * Returns a callback that sends the user through Auth0 login again and brings
 * them back to the page they were on.
 */
export function useRequireLogin(): () => void {
  const { loginWithRedirect } = useAuth0()

  return useCallback(() => {
    if (redirectInFlight) return
    redirectInFlight = true
    void loginWithRedirect({
      appState: {
        returnTo: `${window.location.pathname}${window.location.search}`,
      },
    })
  }, [loginWithRedirect])
}
