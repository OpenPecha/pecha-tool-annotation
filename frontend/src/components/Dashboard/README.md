# Dashboard Components

This folder contains all the micro-components that make up the Dashboard functionality, organized for better maintainability and code reusability.

## Component Structure

### Main Components

- **`Dashboard.tsx`** (in `/pages/Dashboard.tsx`) - Main orchestrator component that determines which dashboard to show based on user role
- **`AdminDashboard.tsx`** - Admin-specific dashboard layout with sidebar navigation
- **`RegularUserDashboard.tsx`** - Dashboard for regular users and reviewers

### Admin Components

- **`AdminSidebar.tsx`** - Collapsible sidebar with navigation tabs
- **`AdminWorkSection.tsx`** - Work management tab with start work, work in progress, and recent activity
- **`AdminStatisticsSection.tsx`** - Statistics tab with system and user statistics
- **`AdminUsersSection.tsx`** - Users management tab
- **`AdminBulkUploadSection.tsx`** - Bulk upload tab with file upload functionality

### Features

#### AdminSidebar

- Collapsible sidebar with toggle button
- Four navigation tabs: Work Management, Statistics, Users, Bulk Upload
- Color-coded tabs for better visual distinction
- Responsive design

#### AdminWorkSection

- Start work functionality for admins
- Work in progress display
- Recent activity feed
- Direct navigation to tasks

#### AdminStatisticsSection

- System-wide statistics with charts
- User-specific statistics
- Visual stat cards with different colors

#### AdminUsersSection

- User management interface
- Integrates with existing UserManagement component

#### AdminBulkUploadSection

- Complete file upload workflow
- Drag and drop interface
- File validation
- Upload progress tracking
- Results dashboard

#### RegularUserDashboard

- Start work functionality
- Work in progress display
- Review work (for reviewers)
- Bulk upload (for admins)
- Recent activity feed

## Usage

```typescript
import { AdminDashboard, RegularUserDashboard } from "@/components/Dashboard";

// In main Dashboard component
{
  currentUser?.role === "admin" ? <AdminDashboard /> : <RegularUserDashboard />;
}
```

## Dependencies

- React Query for data fetching
- React Router for navigation
- Sonner for toast notifications
- React icon for icons
- UI components from the shared UI library

## State Management

Each component manages its own state and uses React Query for server state management. The AdminDashboard component manages the sidebar state and active tab state.

## Performance Optimizations

### Lazy Loading

All dashboard components are lazy-loaded using React.lazy() for better performance:

- **Code Splitting**: Components are loaded only when needed
- **Faster Initial Load**: Reduces bundle size for initial page load
- **Intelligent Preloading**: Components are preloaded based on user role and usage patterns

### Component Preloading

The application includes intelligent preloading strategies:

- **Role-based Preloading**: Admin components are preloaded for admin users
- **Tab Switching Optimization**: Admin dashboard preloads commonly used tabs
- **Delayed Loading**: Preloading happens after initial render to avoid blocking

### Loading States

Consistent loading states across all lazy-loaded components:

- **Shared Loading Component**: Reusable loading UI with different sizes
- **Full Screen Loading**: For main dashboard transitions
- **Inline Loading**: For tab switching within admin dashboard

## File Organization

```
Dashboard/
├── index.ts                    # Export all components
├── AdminSidebar.tsx           # Sidebar navigation
├── AdminWorkSection.tsx       # Work management
├── AdminStatisticsSection.tsx # Statistics display
├── AdminUsersSection.tsx      # User management
├── AdminBulkUploadSection.tsx # Bulk upload
├── RegularUserDashboard.tsx   # Regular user dashboard
├── AdminDashboard.tsx         # Admin dashboard layout
└── README.md                  # This file
```

This modular structure makes it easy to maintain, test, and extend the dashboard functionality.
