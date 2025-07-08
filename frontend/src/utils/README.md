# Utility Functions

This folder contains utility functions for performance optimization and app-level functionality.

## App Preloader (`appPreloader.ts`)

Intelligent preloading strategies for app-level page components to improve navigation performance.

### Functions

#### `preloadAuthenticatedRoutes()`

Preloads components typically accessed by authenticated users:

- Dashboard
- Task page

#### `preloadUnauthenticatedRoutes()`

Preloads components for unauthenticated users:

- Login page
- Callback page

#### `preloadByAuthState(isAuthenticated: boolean)`

Automatically chooses the appropriate preloading strategy based on authentication state.

#### `preloadTaskPage()`

Specifically preloads the Task component, useful when user is likely to navigate to a task.

#### `preloadByCurrentRoute(currentPath: string)`

Intelligently preloads next likely components based on current route:

- From `/` or `/dashboard`: Preloads Task page
- From `/login`: Preloads authenticated routes

#### `preloadAllPages()`

Preloads all app pages. Use sparingly as it increases network usage.

### Usage

```typescript
import {
  preloadByAuthState,
  preloadByCurrentRoute,
} from "@/utils/appPreloader";

// Preload based on authentication
useEffect(() => {
  preloadByAuthState(isAuthenticated);
}, [isAuthenticated]);

// Preload based on current route
useEffect(() => {
  preloadByCurrentRoute(location.pathname);
}, [location.pathname]);
```

## Component Preloader (`componentPreloader.ts`)

Dashboard-specific component preloading strategies.

### Functions

#### `preloadDashboardComponents()`

Preloads commonly used admin dashboard components:

- AdminWorkSection (default tab)
- AdminStatisticsSection (frequently accessed)

#### `preloadByUserRole(userRole: string)`

Preloads dashboard components based on user role:

- Admin: Preloads admin dashboard and components
- Others: Preloads regular user dashboard

### Usage

```typescript
import { preloadByUserRole } from "@/utils/componentPreloader";

useEffect(() => {
  if (currentUser?.role) {
    preloadByUserRole(currentUser.role);
  }
}, [currentUser?.role]);
```

## Performance Benefits

1. **Faster Navigation**: Components are preloaded before user navigates to them
2. **Intelligent Loading**: Only preloads components likely to be used
3. **Reduced Perceived Load Times**: Next page loads instantly if preloaded
4. **Resource Efficient**: Delayed and conditional preloading prevents resource waste
5. **Better UX**: Seamless navigation experience

## Best Practices

1. **Delay Preloading**: Use `setTimeout` to avoid blocking initial render
2. **Conditional Loading**: Only preload what's needed based on user state
3. **Cleanup Timeouts**: Always clear timeouts to prevent memory leaks
4. **Monitor Performance**: Check that preloading improves rather than hinders performance

## Example Implementation

```typescript
// In App.tsx
useEffect(() => {
  const timeoutId = setTimeout(() => {
    preloadByAuthState(isAuthenticated);
  }, 100);
  return () => clearTimeout(timeoutId);
}, [isAuthenticated]);
```
