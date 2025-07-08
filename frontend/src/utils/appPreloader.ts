// App-level component preloader utility
export const preloadAuthenticatedRoutes = () => {
  // Preload main dashboard for authenticated users
  import("../pages/Dashboard");

  // Preload task page since it's commonly accessed after dashboard
  import("../pages/Task");
};

export const preloadUnauthenticatedRoutes = () => {
  // Preload login and callback pages for unauthenticated users
  import("../pages/Login");
  import("../pages/Callback");
};

export const preloadByAuthState = (isAuthenticated: boolean) => {
  if (isAuthenticated) {
    preloadAuthenticatedRoutes();
  } else {
    preloadUnauthenticatedRoutes();
  }
};

// Preload task page when user is likely to navigate to it
export const preloadTaskPage = () => {
  import("../pages/Task");
};

// Preload all app pages (use sparingly)
export const preloadAllPages = () => {
  import("../pages/Dashboard");
  import("../pages/Task");
  import("../pages/Login");
  import("../pages/Callback");
};

// Preload based on current route to anticipate next navigation
export const preloadByCurrentRoute = (currentPath: string) => {
  switch (currentPath) {
    case "/":
    case "/dashboard":
      // From dashboard, user might go to task
      preloadTaskPage();
      break;
    case "/login":
      // From login, user will go to dashboard after auth
      preloadAuthenticatedRoutes();
      break;
    default:
      break;
  }
};
