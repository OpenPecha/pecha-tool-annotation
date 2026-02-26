# Pecha Annotation Tool

A comprehensive text annotation platform for collaborative annotation, review, and management workflows. Built with a modern React frontend and a robust FastAPI backend, featuring Auth0 authentication, role-based access control, and advanced review workflows.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Setup and Installation](#-setup-and-installation)
- [Running the Project](#-running-the-project)
- [Frontend](#-frontend)
- [Backend](#-backend)
- [Changelog / What's New](#-changelog--whats-new)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

### Purpose

The Pecha Annotation Tool is designed for teams that need to:
- **Annotate** texts with various types of annotations (terminology, structural elements, style issues, etc.)
- **Review** annotations collaboratively with feedback loops
- **Manage** large datasets with bulk upload and export capabilities
- **Track** progress through status-based workflows
- **Integrate** seamlessly with Auth0 for secure authentication

### Tech Stack

#### Frontend
- **React 19** with TypeScript
- **Vite 7** for fast development and optimized builds
- **Tailwind CSS 4** for modern, responsive styling
- **TanStack Query v5** for server state management and caching
- **Zustand** for local UI state with persistence
- **CodeMirror 6** for rich text editing
- **Auth0 React SDK** for authentication
- **Umami Analytics** for usage tracking (optional)
- **Userback** for user feedback (optional)

#### Backend
- **FastAPI** for high-performance API endpoints
- **SQLAlchemy** for ORM and database management
- **PostgreSQL** for data persistence
- **Alembic** for database migrations
- **Auth0** for JWT token validation and user management
- **Pydantic** for data validation and serialization

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React 19 + TypeScript + Vite                          │ │
│  │  ├─ Auth0 SDK (Authentication)                         │ │
│  │  ├─ TanStack Query (API State)                         │ │
│  │  ├─ Zustand (UI State)                                 │ │
│  │  └─ CodeMirror (Text Editing)                          │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/REST API
                       │ JWT Bearer Tokens
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND API (FastAPI)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Layer (FastAPI + Pydantic)                        │ │
│  │  ├─ /users      (User Management)                      │ │
│  │  ├─ /texts      (Text Management)                      │ │
│  │  ├─ /annotations (Annotation CRUD)                     │ │
│  │  ├─ /reviews    (Review Workflows)                     │ │
│  │  ├─ /annotation-lists (Categories)                     │ │
│  │  ├─ /bulk-upload (Batch Import)                        │ │
│  │  └─ /export     (Data Export)                          │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Business Logic (CRUD + Auth)                          │ │
│  │  ├─ Auth0 Token Validation                             │ │
│  │  ├─ Role-Based Access Control                          │ │
│  │  └─ Workflow State Management                          │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Data Layer (SQLAlchemy ORM)                           │ │
│  │  ├─ User Model                                         │ │
│  │  ├─ Text Model                                         │ │
│  │  ├─ Annotation Model                                   │ │
│  │  ├─ AnnotationReview Model                             │ │
│  │  ├─ AnnotationList Model                               │ │
│  │  └─ UserRejectedText Model                             │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │ SQL
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│  ├─ users (Auth0 integrated)                                │
│  ├─ texts (with translations & status tracking)             │
│  ├─ annotations (with cascade delete)                       │
│  ├─ annotation_reviews (feedback loop)                      │
│  ├─ annotation_lists (hierarchical categories)              │
│  └─ user_rejected_texts (skip tracking)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Auth0 (External)                          │
│  ├─ User Authentication                                     │
│  ├─ JWT Token Issuance                                      │
│  └─ User Profile Management                                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Workflows

1. **Annotation Workflow**
   - Texts are created or bulk-uploaded (status: `initialized`)
   - Annotators view available texts and create annotations (status: `progress` → `annotated`)
   - Annotations include type, position, confidence, level, and metadata

2. **Review Workflow**
   - Reviewers access annotated texts via review interface
   - Each annotation is reviewed (agree/disagree with optional comments)
   - Text status updates automatically:
     - `reviewed` (all agreed)
     - `reviewed_needs_revision` (any disagreements)
   - Annotators receive feedback and can revise

3. **Export Workflow**
   - Admins filter by date range and status
   - System generates ZIP files with JSON exports
   - Each text includes all annotations and metadata

---

## 🚀 Setup and Installation

### Prerequisites

- **Node.js** 18+ and npm (for frontend)
- **Python** 3.8+ (for backend)
- **PostgreSQL** 12+ (for database)
- **Auth0 Account** (for authentication)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd pecha-tool-annotation
```

### 2. Auth0 Configuration

Before setting up frontend or backend, configure Auth0:

1. Create an Auth0 application (Single Page Application)
2. Create an Auth0 API
3. Configure the following in Auth0 dashboard:
   - **Allowed Callback URLs**: `http://localhost:3000/callback`, `<your-production-url>/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`, `<your-production-url>`
   - **Allowed Web Origins**: `http://localhost:3000`, `<your-production-url>`
   - **Allowed Origins (CORS)**: `http://localhost:3000`, `<your-production-url>`

4. Note the following values (you'll need them for `.env` files):
   - **Domain**: `<your-tenant>.auth0.com`
   - **Client ID**: From your application settings
   - **API Audience**: From your API settings

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create PostgreSQL database
createdb pecha_annotation_db

# Configure environment variables
cp env.example .env
```

#### Backend Environment Variables

Edit `backend/.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/pecha_annotation_db

# Auth0 Configuration (REQUIRED)
AUTH0_DOMAIN=<your-tenant>.auth0.com
AUTH0_AUDIENCE=<your-api-identifier>

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Optional Configuration
DEBUG=false
LOG_LEVEL=info
AUTH0_CACHE_TTL=3600
AUTH0_REQUEST_TIMEOUT=10
```

#### Run Database Migrations

```bash
# Apply all migrations
alembic upgrade head

# Optional: Initialize with sample data
python init_db.py
```

### 4. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm ci

# Configure environment variables
# Create .env.local file
```

#### Frontend Environment Variables

Create `frontend/.env.local` with your configuration:

```env
# Backend API URL (REQUIRED)
VITE_SERVER_URL=http://localhost:8000/v1

# Auth0 Configuration (REQUIRED)
VITE_AUTH0_DOMAIN=<your-tenant>.auth0.com
VITE_AUTH0_CLIENT_ID=<your-client-id>
VITE_AUTH0_AUDIENCE=<your-api-identifier>

# Optional: Custom redirect URI (defaults to window.location.origin)
VITE_AUTH0_REDIRECT_URI=http://localhost:3000

# Optional: Analytics and Feedback
VITE_ENVIRONMENT=development
VITE_UMAMI_WEBSITE_ID=<your-umami-id>
VITE_UMAMI_SRC=<your-umami-script-url>
VITE_USERBACK_ID=<your-userback-id>
```

---

## 🏃 Running the Project

### Development Mode

#### Option 1: Run Separately

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
```
The API will be available at `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
The app will be available at `http://localhost:3000`

#### Option 2: Run with Scripts (Recommended)

Create a `dev.sh` script in the project root:

```bash
#!/bin/bash
# Start backend in background
cd backend && source venv/bin/activate && python main.py &
BACKEND_PID=$!

# Start frontend
cd ../frontend && npm run dev

# Kill backend on exit
trap "kill $BACKEND_PID" EXIT
```

Make it executable and run:
```bash
chmod +x dev.sh
./dev.sh
```

### Production Mode

#### Backend Production

```bash
cd backend
source venv/bin/activate

# Update .env for production
DEBUG=false
LOG_LEVEL=warning

# Run with Gunicorn (install first: pip install gunicorn)
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

#### Frontend Production

```bash
cd frontend

# Build for production
npm run build

# Preview production build locally
npm run preview  # Runs on port 10000

# Or serve with a static file server
npx serve -s dist -l 3000
```

### Accessing the Application

Once both servers are running:

- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs
- **Backend ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/v1/health

---

## 🎨 Frontend

### Architecture Overview

The frontend is a modern React application built with:

- **React 19** for UI components with improved concurrent features
- **TypeScript** for type safety
- **Vite 7** for lightning-fast development and optimized production builds
- **Tailwind CSS 4** for utility-first styling with the new Vite plugin
- **React Router 7** for routing with lazy-loaded pages
- **TanStack Query v5** for server state management, caching, and optimistic updates
- **Zustand** for local UI state with persistence
- **CodeMirror 6** for advanced text editing capabilities

### Key Features

#### 🔐 Authentication
- **Auth0 Integration**: Secure authentication with automatic token refresh
- **Silent Auth**: Automatic re-authentication on page reload
- **Role-Based UI**: Different interfaces for Admins, Reviewers, and Annotators
- **Token Management**: Automatic token storage and attachment to API requests

#### 📝 Annotation Interface
- **Visual Text Annotator**: Highlight text and assign annotation types
- **Multi-Level Annotations**: Support for minor, major, and critical levels
- **Real-Time Validation**: Position and overlap detection
- **Custom Names**: Add custom names to structural annotations
- **Color Coding**: Configurable color schemes for different annotation types
- **Confidence Scoring**: Track annotation confidence levels

#### ✅ Review Interface
- **Comprehensive Review Sessions**: View all annotations for a text
- **Agree/Disagree Decisions**: Mark annotations as correct or incorrect
- **Feedback Comments**: Add detailed feedback for annotators
- **Progress Tracking**: Monitor review progress in real-time
- **Annotator Feedback Loop**: Annotators can view reviews on their work

#### 📊 Dashboard
- **Statistics**: View annotation and review metrics
- **Task Management**: Track assigned texts and progress
- **User Activity**: Monitor team activity and performance
- **Charts and Graphs**: Visual representation of data using Recharts

#### 📋 Annotation Lists
- **Hierarchical Categories**: Browse annotation types in tree structure
- **Quick Selection**: Select multiple annotation types at once
- **Search and Filter**: Find specific annotation categories
- **Type Switching**: Toggle between different annotation list types

#### 🔄 Data Management
- **Bulk Upload**: Upload multiple JSON files (Admin only)
- **Export**: Download texts and annotations as ZIP files (Admin only)
- **Text Rejection**: Skip texts that are not suitable for annotation
- **Translation Support**: View original text with translations side-by-side

### Project Structure

```
frontend/
├── src/
│   ├── api/                    # API client modules
│   │   ├── annotation_list.ts  # Annotation list API
│   │   ├── annotations.ts      # Annotations API
│   │   ├── bdrc.ts             # BDRC integration
│   │   ├── bulk-upload.ts      # Bulk upload API
│   │   ├── export.ts           # Export API
│   │   ├── reviews.ts          # Review API
│   │   ├── text.ts             # Text API
│   │   ├── types.ts            # TypeScript types
│   │   ├── users.ts            # Users API
│   │   └── utils.ts            # API utilities
│   ├── auth/                   # Authentication modules
│   │   ├── auth0-provider.tsx  # Auth0 configuration
│   │   ├── auth-context-provider.tsx  # Auth context
│   │   ├── types.ts            # Auth types
│   │   └── use-auth-hook.ts    # Auth hook
│   ├── components/             # Reusable components
│   │   ├── AnnotationSidebar/  # Sidebar components
│   │   ├── TextAnnotator.tsx   # Main annotation component
│   │   ├── NavigationModeSelector.tsx
│   │   ├── AnnotationColorSettings.tsx
│   │   └── ... (44 more components)
│   ├── config/                 # Configuration files
│   │   ├── annotation-options.ts  # Annotation type definitions
│   │   └── structural-annotations.ts  # Structural types
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-toast.ts
│   │   ├── use-theme.ts
│   │   ├── use-umami-tracking.ts
│   │   └── ... (2 more hooks)
│   ├── pages/                  # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Task.tsx           # Annotation task page
│   │   ├── Review.tsx         # Review page
│   │   ├── Login.tsx
│   │   ├── Callback.tsx       # Auth0 callback
│   │   └── NotFound.tsx
│   ├── providers/              # Context providers
│   │   └── UserbackProvider.tsx
│   ├── store/                  # Zustand stores
│   │   └── annotation.ts      # Annotation UI state
│   ├── utils/                  # Utility functions
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── public/                    # Static assets
│   ├── font/                  # Tibetan fonts
│   ├── error_list.json
│   └── ... (favicon files)
├── package.json              # Dependencies
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript config
└── tailwind.config.js       # Tailwind config
```

### State Management

#### Server State (TanStack Query)
- Handles all API data fetching, caching, and synchronization
- Automatic background refetching and cache invalidation
- Optimistic updates for better UX
- Query keys organized by feature:
  - `['texts']`: Text data
  - `['annotations']`: Annotation data
  - `['reviews']`: Review data
  - `['users']`: User data
  - `['annotation-lists']`: Category data

#### Local UI State (Zustand)
- Persisted state for user preferences:
  - Navigation mode (hierarchical/flat)
  - Sidebar visibility
  - Selected annotation list type
  - Selected annotation types (as Set)
- Non-persisted state for temporary UI:
  - Current editing state
  - Modal visibility

### Integration with Backend

The frontend communicates with the backend via REST API:

```typescript
// Example: Creating an annotation
import { annotationsApi } from '@/api/annotations';

const createAnnotation = useMutation({
  mutationFn: (data: AnnotationCreate) => 
    annotationsApi.createAnnotation(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['annotations'] });
    toast.success('Annotation created successfully');
  },
});
```

All API calls automatically include:
- **Authorization Header**: `Bearer <auth0-token>`
- **Content-Type**: `application/json` or `multipart/form-data`
- **Error Handling**: Standardized error responses with toast notifications

### Analytics and Feedback

#### Umami Analytics (Optional)
- Tracks page views and user interactions
- User identification for cohort analysis
- Event tracking for key actions
- Enabled in production with environment variables

#### Userback Feedback (Optional)
- In-app feedback widget
- Screenshot and annotation capabilities
- User context attached to feedback
- Enabled when user is authenticated

---

## 🔧 Backend

### Core Features

#### 🔐 Authentication & Authorization

**Auth0 Integration**
- JWT token validation with RSA256 signature verification
- Automatic user creation from Auth0 tokens
- Token refresh handling
- Public key caching for performance

**Role-Based Access Control**
- **Admin**: Full system access, user management, bulk operations, exports
- **Reviewer**: Review texts, update status, view review data
- **Annotator**: Create annotations, view their reviewed work
- **User**: Basic read access, text creation

**Permission Matrix**

| Action                  | Admin | Reviewer | Annotator | User |
|------------------------|-------|----------|-----------|------|
| Manage Users           | ✅    | ❌       | ❌        | ❌   |
| Create Texts           | ✅    | ✅       | ✅        | ✅   |
| Review Texts           | ✅    | ✅       | ❌        | ❌   |
| Create Annotations     | ✅    | ✅       | ✅        | ❌   |
| View All Data          | ✅    | ✅       | ✅        | ✅   |
| Bulk Upload            | ✅    | ❌       | ❌        | ❌   |
| Export Data            | ✅    | ❌       | ❌        | ❌   |
| Manage Annotation Lists| ✅    | ❌       | ❌        | ❌   |

#### 📝 Text Management

**Status Lifecycle**
- `initialized`: Text created and ready for annotation
- `progress`: Annotation in progress
- `annotated`: Annotation completed, ready for review
- `reviewed`: Review completed and approved
- `reviewed_needs_revision`: Review completed with required changes
- `skipped`: Text skipped by user

**Features**
- Translation support (bilingual display)
- Source and language tracking
- Upload tracking (system vs. user-uploaded)
- User rejection tracking (skip functionality)
- Search and filtering capabilities
- Annotator and reviewer assignment

#### 🏷️ Annotation System

**Annotation Types**
- Terminology
- Structural elements (headers, sections)
- Style and formatting issues
- Accuracy errors
- Custom types via JSON configuration

**Features**
- Position validation (start/end bounds)
- Overlap detection
- Confidence scoring (0-100)
- Importance levels (minor, major, critical)
- JSON metadata storage
- Cascade delete (removing text removes annotations)
- System vs. user annotations (nullable annotator_id)

#### ✅ Review System

**Workflow**
1. Reviewer starts review session for a text
2. System provides all annotations with context
3. Reviewer evaluates each annotation (agree/disagree)
4. Reviewer adds optional comments for feedback
5. Reviewer submits all decisions
6. System updates text status automatically
7. Annotator receives feedback

**Features**
- Comprehensive review sessions
- Decision tracking (agree/disagree)
- Comment system for detailed feedback
- Progress tracking (in-progress reviews)
- Annotator feedback loop
- Reviewer statistics and performance metrics

#### 📋 Annotation Lists

**Hierarchical Categories**
- Parent-child relationships
- Unlimited nesting levels
- Type-based categorization
- Version and copyright metadata

**Features**
- JSON file upload
- Hierarchical or flat retrieval
- Type-based filtering
- Bulk delete by type

**Documentation**
For detailed file format documentation, examples, and validation rules, see:
- [Annotation List Upload Format Documentation](./docs/ANNOTATION_LIST_UPLOAD_FORMAT.md)

#### 📦 Bulk Upload

**Features**
- Upload multiple JSON files simultaneously
- Automatic text and annotation creation
- Schema validation before import
- Title uniqueness checking
- Annotation bounds validation
- Detailed success/failure reporting
- Dry-run validation endpoint

**Documentation**
For detailed file format documentation, examples, and validation rules, see:
- [Bulk Upload Format Documentation](./docs/BULK_UPLOAD_FORMAT.md)

**JSON Format**
```json
{
  "text": {
    "title": "Sample Text",
    "content": "Text content...",
    "translation": "Translation (optional)...",
    "source": "Source name",
    "language": "bo"
  },
  "annotations": [
    {
      "annotation_type": "terminology",
      "start_position": 0,
      "end_position": 10,
      "selected_text": "Sample",
      "label": "term",
      "name": "technical_term",
      "level": "high",
      "confidence": 0.95,
      "meta": {}
    }
  ]
}
```

#### 📤 Export System

**Features**
- Date range filtering
- Status filtering (reviewed/annotated)
- ZIP file generation
- Individual JSON files per text
- Export statistics endpoint
- Admin-only access

**Export Format**
```json
{
  "text": {
    "title": "Text Title",
    "content": "Text content...",
    "translation": "Translation...",
    "language": "bo",
    "source": "Source"
  },
  "annotations": [
    {
      "annotation_type": "terminology",
      "start_position": 0,
      "end_position": 10,
      "label": "term",
      "name": "technical_term",
      "level": "high",
      "selected_text": "Sample",
      "confidence": 0.95,
      "meta": {}
    }
  ]
}
```

### API Endpoints

#### Users (`/v1/users`)
- `GET /me` - Get current user profile
- `PUT /me` - Update current user profile
- `GET /` - List all users (Admin)
- `GET /{id}` - Get user by ID (Admin)
- `PUT /{id}` - Update user (Admin)
- `DELETE /{id}` - Delete user (Admin)
- `GET /search/` - Search users (Admin)
- `GET /debug/auth0` - Auth0 debug info (Debug mode only)

#### Texts (`/v1/texts`)
- `GET /` - List texts with filtering
- `POST /` - Create text
- `GET /for-annotation` - Get texts for annotation (excludes user's own uploads and rejected texts)
- `GET /for-review` - Get texts for review (Reviewer)
- `GET /stats` - Get text statistics
- `GET /search/` - Search texts
- `GET /{id}` - Get text by ID
- `GET /{id}/with-annotations` - Get text with annotations
- `PUT /{id}` - Update text
- `PUT /{id}/status` - Update text status (Reviewer)
- `DELETE /{id}` - Delete text (Admin)
- `POST /{id}/reject` - Reject/skip a text

#### Annotations (`/v1/annotations`)
- `GET /` - List annotations with filtering
- `POST /` - Create annotation (Annotator)
- `GET /my-annotations` - Get current user's annotations
- `GET /text/{id}` - Get annotations by text
- `GET /type/{type}` - Get annotations by type
- `GET /stats` - Get annotation statistics
- `GET /{id}` - Get annotation by ID
- `PUT /{id}` - Update annotation
- `DELETE /{id}` - Delete annotation
- `POST /validate-positions` - Validate annotation positions

#### Reviews (`/v1/reviews`)
- `GET /texts-for-review` - Get texts ready for review (Reviewer)
- `GET /my-review-progress` - Get reviewer's in-progress reviews (Reviewer)
- `GET /session/{text_id}` - Start review session (Reviewer)
- `GET /status/{text_id}` - Get review status for a text (Reviewer)
- `POST /submit` - Submit review decisions (Reviewer)
- `POST /annotation/{annotation_id}` - Review specific annotation (Reviewer)
- `GET /annotation/{annotation_id}` - Get reviews for annotation
- `GET /my-reviews` - Get all reviews by current reviewer (Reviewer)
- `GET /stats` - Get reviewer statistics (Reviewer)
- `GET /annotator/reviewed-work` - Get annotator's reviewed work with feedback (Annotator)
- `GET /annotator/texts-need-revision` - Get texts needing revision (Annotator)
- `DELETE /{review_id}` - Delete a review (Reviewer)

#### Annotation Lists (`/v1/annotation-lists`)
- `POST /upload` - Upload hierarchical annotation list JSON (Admin)
- `GET /` - Get all annotation lists
- `GET /types` - Get all unique annotation list types
- `GET /type/{type_value}` - Get lists by type (hierarchical)
- `GET /type/{type_value}/flat` - Get lists by type (flat list)
- `DELETE /type/{type_value}` - Delete all lists of a type (Admin)

#### Bulk Upload (`/v1/bulk-upload`)
- `POST /upload-files` - Upload multiple JSON files (Admin)
- `POST /validate-files` - Validate files without importing (Admin)

#### Export (`/v1/export`)
- `GET /stats` - Get export statistics for date range (Admin)
- `GET /download` - Download texts and annotations as ZIP (Admin)

### Database Models

#### User Model
```python
- auth0_user_id: String (unique)
- username: String
- email: String (unique)
- full_name: String
- role: Enum (admin, user, annotator, reviewer)
- is_active: Boolean
- created_at: DateTime
- updated_at: DateTime

Relationships:
- annotations (one-to-many)
- reviewed_texts (one-to-many)
- annotated_texts (one-to-many)
- uploaded_texts (one-to-many)
- rejected_texts (many-to-many)
- annotation_reviews (one-to-many)
```

#### Text Model
```python
- id: Integer (primary key)
- title: String (unique)
- content: Text
- translation: Text (nullable)
- source: String
- language: String
- status: Enum
- annotator_id: Integer (nullable, foreign key)
- reviewer_id: Integer (nullable, foreign key)
- uploaded_by: Integer (nullable, foreign key)
- created_at: DateTime
- updated_at: DateTime

Relationships:
- annotations (one-to-many, cascade delete)
- reviewer (many-to-one)
- annotator (many-to-one)
- uploader (many-to-one)
- rejected_by_users (many-to-many)
```

#### Annotation Model
```python
- id: Integer (primary key)
- text_id: Integer (foreign key, cascade delete)
- annotator_id: Integer (nullable, foreign key)
- annotation_type: String
- start_position: Integer
- end_position: Integer
- selected_text: String
- label: String
- name: String (for structural annotations)
- level: String (minor, major, critical)
- meta: JSON
- confidence: Integer (0-100)
- created_at: DateTime
- updated_at: DateTime

Relationships:
- text (many-to-one)
- annotator (many-to-one)
- reviews (one-to-many, cascade delete)
```

#### AnnotationReview Model
```python
- id: Integer (primary key)
- annotation_id: Integer (foreign key, cascade delete)
- reviewer_id: Integer (foreign key)
- decision: Enum (agree, disagree)
- comment: Text (nullable)
- created_at: DateTime
- updated_at: DateTime

Relationships:
- annotation (many-to-one)
- reviewer (many-to-one)

Constraints:
- Unique constraint on (annotation_id, reviewer_id)
```

#### AnnotationList Model
```python
- id: UUID (primary key)
- type: String
- title: String
- level: String
- parent_id: UUID (nullable, foreign key)
- description: Text
- created_by: Integer (foreign key)
- meta: JSON
- created_at: DateTime

Relationships:
- creator (many-to-one)
- parent (self-referential)
- children (one-to-many)
```

#### UserRejectedText Model
```python
- id: Integer (primary key)
- user_id: Integer (foreign key)
- text_id: Integer (foreign key)
- rejected_at: DateTime

Relationships:
- user (many-to-one)
- text (many-to-one)

Constraints:
- Unique constraint on (user_id, text_id)
```

### Database Migrations

The project uses Alembic for database migrations:

```bash
# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history

# View current version
alembic current
```

### Project Structure

```
backend/
├── main.py                    # FastAPI application entry point
├── database.py                # Database configuration
├── deps.py                    # Dependency injection
├── auth.py                    # Auth0 authentication utilities
├── init_db.py                 # Database initialization script
├── requirements.txt           # Python dependencies
├── alembic/                   # Database migrations
│   ├── versions/              # Migration scripts
│   └── env.py                 # Alembic configuration
├── models/                    # SQLAlchemy models
│   ├── __init__.py
│   ├── user.py
│   ├── text.py
│   ├── annotation.py
│   ├── annotation_review.py
│   ├── annotationlist.py
│   └── user_rejected_text.py
├── schemas/                   # Pydantic schemas
│   ├── __init__.py
│   ├── user.py
│   ├── text.py
│   ├── annotation.py
│   ├── annotation_review.py
│   ├── annotationlist.py
│   ├── bulk_upload.py
│   ├── combined.py
│   └── user_rejected_text.py
├── crud/                      # Database operations
│   ├── __init__.py
│   ├── user.py
│   ├── text.py
│   ├── annotation.py
│   ├── annotation_review.py
│   ├── annotationlist.py
│   └── user_rejected_text.py
└── routers/                   # API routes
    ├── __init__.py
    ├── users.py
    ├── texts.py
    ├── annotations.py
    ├── reviews.py
    ├── annotationlist.py
    ├── bulk_upload.py
    └── export.py
```

### Development

#### Debug Mode

Enable debug mode in `.env`:
```env
DEBUG=true
LOG_LEVEL=debug
```

Access debug endpoint:
```bash
GET /v1/users/debug/auth0
```

#### Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# Run with coverage
pytest --cov=.
```

---

## 🆕 Changelog / What's New

### Version 2.0.0 (October 2025)

#### Major Features

**Frontend**
- ✨ Upgraded to React 19 with improved concurrent features
- 🚀 Migrated to Vite 7 for faster builds and development
- 🎨 Integrated Tailwind CSS 4 with new Vite plugin
- 📡 Implemented TanStack Query v5 for server state management
- 🗄️ Added Zustand for local UI state with persistence
- 🔐 Complete Auth0 integration with silent authentication
- 📊 Umami analytics integration for usage tracking
- 💬 Userback feedback widget for user feedback
- 🔄 React Router 7 with lazy-loaded routes for better performance
- 📝 CodeMirror 6 for enhanced text editing

**Backend**
- ✅ **Review System**: Complete annotation review workflow with feedback loops
  - Agree/disagree decision tracking
  - Review comments and feedback
  - Review session management
  - Automatic status updates based on review outcomes
  - Annotator feedback loop
- 📋 **Annotation Lists**: Hierarchical category management
  - JSON file upload
  - Parent-child relationships
  - Flat and hierarchical retrieval
  - Type-based filtering
- 📦 **Bulk Upload**: Upload multiple texts with annotations
  - Schema validation
  - Title uniqueness checking
  - Bounds validation
  - Dry-run validation
- 📤 **Export System**: Download texts and annotations
  - Date range filtering
  - Status filtering
  - ZIP file generation with individual JSON files
  - Export statistics
- 🔒 **Enhanced Auth0 Integration**:
  - Improved token validation
  - Public key caching
  - Better error handling
  - Debug endpoints for development
- 🗄️ **Database Improvements**:
  - Cascade delete support
  - Translation field for texts
  - Annotation levels (minor, major, critical)
  - User rejected texts tracking
  - Reviewed needs revision status

#### Database Schema Changes

**New Tables**
- `annotation_reviews`: Review decisions and feedback
- `annotation_lists`: Hierarchical annotation categories
- `user_rejected_texts`: Track skipped texts

**Updated Tables**
- `texts`: Added `translation`, `uploaded_by`, `reviewed_needs_revision` status
- `annotations`: Added `level` field, nullable `annotator_id` for system annotations
- `texts`: Added unique constraint on `title`

**Migrations Added**
- Initial migration (base schema)
- Add annotation reviews table
- Add user rejected texts table
- Add annotation list table
- Add reviewed needs revision status
- Add cascade delete to annotations
- Add annotation level field
- Add translation field to texts
- Add uploaded by field to texts
- Add title unique constraint
- Make annotator ID nullable for system annotations

#### Breaking Changes

- Frontend now requires Node.js 18+ (React 19)
- Backend API responses include new fields (`translation`, `level`, `uploaded_by`)
- Annotation creation now supports optional `level` parameter
- Text creation now supports optional `translation` parameter
- Review endpoints require `Reviewer` role
- Export endpoints require `Admin` role

#### Improvements

**Performance**
- Frontend: Lazy loading of routes reduces initial bundle size
- Frontend: TanStack Query caching reduces API calls
- Backend: Auth0 public key caching reduces external requests
- Frontend: Optimistic updates improve perceived performance

**User Experience**
- Better error messages with toast notifications
- Loading states for all async operations
- Skeleton loaders for better perceived performance
- Responsive design improvements
- Dark mode support (theme system)

**Developer Experience**
- Improved TypeScript types across frontend
- Better API error handling
- Comprehensive API documentation
- Database migration system
- Debug mode with detailed logging
- Environment variable validation

#### Bug Fixes

- Fixed annotation position validation edge cases
- Resolved cascade delete issues
- Improved Auth0 token refresh handling
- Fixed CORS configuration for production
- Resolved annotation overlap detection issues

---

## 🤝 Contributing

We welcome contributions to the Pecha Annotation Tool! Here's how you can help:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Add tests if applicable
5. Ensure all tests pass
6. Create migrations if schema changes are required
7. Update documentation
8. Submit a pull request

### Development Guidelines

**Frontend**
- Follow TypeScript best practices
- Use functional components with hooks
- Write meaningful component names and comments
- Follow the existing code style
- Test your changes in different browsers
- Ensure responsive design works on mobile

**Backend**
- Follow PEP 8 style guide
- Write type hints for all functions
- Add docstrings to all public functions
- Write Pydantic schemas for all request/response models
- Create Alembic migrations for schema changes
- Test all endpoints with different roles
- Update API documentation

### Code Review Process

1. Automated checks must pass (linting, type checking)
2. Code review by at least one maintainer
3. All discussions resolved
4. Documentation updated
5. Changelog updated (if applicable)

### Reporting Issues

When reporting issues, please include:
- Clear description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, browser, Python version, etc.)
- Screenshots or error logs (if applicable)

---

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

## 📞 Support

For questions, issues, or support:

- **Documentation**: Review this README and the API docs at `/docs`
- **Issues**: Create a GitHub issue with detailed information
- **Debug Mode**: Enable debug mode for detailed logs
- **Health Check**: Visit `/api/v1/health` to check system status
- **Auth0 Debug**: Access `/api/v1/users/debug/auth0` in debug mode

---

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/) and [React](https://react.dev/)
- Authentication powered by [Auth0](https://auth0.com/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Text editing with [CodeMirror](https://codemirror.net/)

---

**Version**: 2.0.0  
**Last Updated**: October 2025  
**Status**: Active Development

**Tech Stack**: React 19 • TypeScript • Vite 7 • Tailwind CSS 4 • FastAPI • PostgreSQL • Auth0  
**Languages**: Python 3.8+ • Node.js 18+

