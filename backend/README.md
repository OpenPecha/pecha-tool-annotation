# Pecha Annotation Tool - Backend API

A comprehensive FastAPI backend for text annotation with Auth0 authentication, role-based access control, review workflows, and bulk data management.

## Features

### 🔐 Auth0 Authentication & Authorization

- Auth0 JWT token validation
- Role-based access control (Admin, User, Annotator, Reviewer)
- Automatic user creation from Auth0 tokens
- Secure token verification with RSA256

### 👥 User Management

- Auto-registration from Auth0 tokens
- User profile management
- Role assignment (Admin only)
- User search and filtering

### 📝 Text Management

- Text creation and management with optional translation support
- Advanced status tracking:
  - `initialized` - Text created and ready for annotation
  - `progress` - Annotation in progress
  - `annotated` - Annotation completed, ready for review
  - `reviewed` - Review completed and approved
  - `reviewed_needs_revision` - Review completed with required changes
  - `skipped` - Text skipped by user
- Text search and filtering
- Language support
- Source tracking
- Uploaded by tracking (system texts vs user-uploaded texts)
- User rejection tracking (users can skip texts)

### 🏷️ Annotation System

- Create annotations with type, position, and metadata
- Position validation and overlap detection
- Annotation statistics and analytics
- Flexible JSON metadata storage
- Confidence scoring
- Annotation levels support
- Cascade delete support (deleting text removes annotations)
- System annotations (bulk uploaded) vs user annotations

### 📋 Annotation Lists (NEW)

- Hierarchical annotation category management
- Upload JSON files with category structures
- Parent-child relationship support
- Retrieve categories in flat or hierarchical format
- Type-based categorization
- Version and copyright metadata support

### ✅ Review System (NEW)

- Comprehensive annotation review workflow
- Agree/disagree decision tracking
- Review comments and feedback
- Review session management
- Reviewer assignment to texts
- Review progress tracking
- Annotator feedback loop (view reviews on their work)
- Automatic status updates based on review outcomes

### 📦 Bulk Upload (NEW)

- Upload multiple JSON files simultaneously
- Automatic text and annotation creation
- Schema validation before import
- Title uniqueness checking
- Annotation bounds validation
- Detailed success/failure reporting
- Dry-run validation endpoint

### 📤 Export System (NEW)

- Export texts and annotations by date range
- Filter by status (reviewed/annotated)
- ZIP file download with individual JSON files
- Export statistics endpoint
- Admin-only access

### 📊 Statistics & Analytics

- Text and annotation statistics
- User activity tracking
- Status distribution analytics
- Reviewer performance metrics
- Export statistics by date range

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- PostgreSQL database
- Auth0 account and application setup
- pip or poetry for package management

### Installation

1. **Clone and Navigate**

   ```bash
   cd backend
   ```

2. **Create Virtual Environment**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Auth0 Setup**

   - Create an Auth0 application (SPA or Regular Web App)
   - Create API in Auth0 dashboard
   - Configure allowed callbacks and origins
   - Note your Domain and API Audience

5. **Environment Setup**

   ```bash
   cp env.example .env
   # Edit .env with your database and Auth0 credentials
   ```

   Required environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `AUTH0_DOMAIN` - Your Auth0 domain
   - `AUTH0_AUDIENCE` - Your Auth0 API audience
   - `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
   - `DEBUG` - Enable debug mode (true/false)
   - `LOG_LEVEL` - Logging level (info/debug/warning/error)

6. **Database Setup**

   ```bash
   # Create PostgreSQL database
   createdb pecha_annotation_db

   # Run migrations
   alembic upgrade head

   # Optional: Initialize with sample data
   python init_db.py
   ```

7. **Run the Server**

   ```bash
   python main.py
   ```

The API will be available at:

- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/v1/health
- **Auth0 Debug**: http://localhost:8000/api/v1/users/debug/auth0 (dev only)

## 📁 Project Structure

```
backend/
├── main.py                     # FastAPI application entry point
├── database.py                 # Database configuration
├── deps.py                     # Dependency injection
├── auth.py                     # Auth0 authentication utilities
├── init_db.py                  # Database initialization script
├── alembic/                    # Database migrations
│   ├── versions/               # Migration scripts
│   └── env.py                  # Alembic configuration
├── models/                     # SQLAlchemy models
│   ├── __init__.py
│   ├── user.py                 # User model (Auth0 integrated)
│   ├── text.py                 # Text model
│   ├── annotation.py           # Annotation model
│   ├── annotation_review.py    # Annotation review model (NEW)
│   ├── annotationlist.py       # Annotation list model (NEW)
│   └── user_rejected_text.py   # User rejected text model (NEW)
├── schemas/                    # Pydantic schemas
│   ├── __init__.py
│   ├── user.py                 # User schemas
│   ├── text.py                 # Text schemas
│   ├── annotation.py           # Annotation schemas
│   ├── annotation_review.py    # Review schemas (NEW)
│   ├── annotationlist.py       # Annotation list schemas (NEW)
│   ├── bulk_upload.py          # Bulk upload schemas (NEW)
│   ├── combined.py             # Combined schemas
│   └── user_rejected_text.py   # User rejected text schemas (NEW)
├── crud/                       # Database operations
│   ├── __init__.py
│   ├── user.py                 # User CRUD
│   ├── text.py                 # Text CRUD
│   ├── annotation.py           # Annotation CRUD
│   ├── annotation_review.py    # Review CRUD (NEW)
│   ├── annotationlist.py       # Annotation list CRUD (NEW)
│   └── user_rejected_text.py   # User rejected text CRUD (NEW)
├── routers/                    # API routes
│   ├── __init__.py
│   ├── users.py                # User management routes
│   ├── texts.py                # Text management routes
│   ├── annotations.py          # Annotation routes
│   ├── reviews.py              # Review routes (NEW)
│   ├── annotationlist.py       # Annotation list routes (NEW)
│   ├── bulk_upload.py          # Bulk upload routes (NEW)
│   └── export.py               # Export routes (NEW)
└── requirements.txt            # Python dependencies
```

## 🔧 Configuration

### Environment Variables

| Variable              | Description                                | Default                                                             | Required |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------- | -------- |
| `DATABASE_URL`        | PostgreSQL connection string               | `postgresql://postgres:password@localhost:5432/pecha_annotation_db` | Yes      |
| `AUTH0_DOMAIN`        | Your Auth0 domain                          | -                                                                   | Yes      |
| `AUTH0_AUDIENCE`      | Your Auth0 API audience identifier         | -                                                                   | Yes      |
| `ALLOWED_ORIGINS`     | CORS allowed origins (comma-separated)     | `http://localhost:3000,http://localhost:5173`                       | No       |
| `DEBUG`               | Enable debug mode                          | `false`                                                             | No       |
| `LOG_LEVEL`           | Logging level                              | `info`                                                              | No       |
| `AUTH0_CACHE_TTL`     | Cache JWKS for N seconds (production)      | -                                                                   | No       |
| `AUTH0_REQUEST_TIMEOUT` | Request timeout in seconds               | `10`                                                                | No       |

### Database Models

#### User Model

- **Roles**: `admin`, `user`, `annotator`, `reviewer`
- **Fields**: auth0_user_id, username, email, full_name, role, is_active
- **Relationships**: annotations, reviewed_texts, annotated_texts, uploaded_texts, rejected_texts, annotation_reviews
- **Auth0 Integration**: Users are automatically created from Auth0 tokens

#### Text Model

- **Status**: `initialized`, `progress`, `annotated`, `reviewed`, `reviewed_needs_revision`, `skipped`
- **Fields**: title (unique), content, translation, source, language, status, annotator_id, reviewer_id, uploaded_by
- **Relationships**: annotations, reviewer, annotator, uploader, rejected_by_users
- **Cascade**: Deleting a text removes all associated annotations

#### Annotation Model

- **Fields**: type, start/end positions, selected_text, label, name, level, meta (JSON), confidence, annotator_id
- **Relationships**: text, annotator, reviews
- **Validation**: position bounds, overlap detection
- **System Annotations**: Bulk uploaded annotations have null annotator_id

#### AnnotationReview Model (NEW)

- **Fields**: annotation_id, reviewer_id, decision (agree/disagree), comment
- **Relationships**: annotation, reviewer
- **Constraints**: One review per annotation per reviewer
- **Cascade**: Deleting annotation removes all reviews

#### AnnotationList Model (NEW)

- **Fields**: id (UUID), type, title, level, parent_id, description, created_by, meta (JSON)
- **Relationships**: creator, parent, children
- **Purpose**: Hierarchical category management for annotation types

#### UserRejectedText Model (NEW)

- **Fields**: user_id, text_id, rejected_at
- **Relationships**: user, text
- **Constraints**: One rejection per user per text
- **Purpose**: Track texts users have skipped

## 🛠️ API Endpoints

### Users (`/v1/users`)

- `GET /me` - Get current user profile
- `PUT /me` - Update current user profile
- `GET /` - List all users (Admin)
- `GET /{id}` - Get user by ID (Admin)
- `PUT /{id}` - Update user (Admin)
- `DELETE /{id}` - Delete user (Admin)
- `GET /search/` - Search users (Admin)
- `GET /debug/auth0` - Auth0 debug info (Debug mode only)

### Texts (`/v1/texts`)

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
- `POST /{id}/reject` - Reject/skip a text (marks as skipped)

### Annotations (`/v1/annotations`)

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

### Reviews (`/v1/reviews`) (NEW)

- `GET /texts-for-review` - Get texts ready for review (Reviewer)
- `GET /my-review-progress` - Get reviewer's in-progress reviews (Reviewer)
- `GET /session/{text_id}` - Start review session and get comprehensive data (Reviewer)
- `GET /status/{text_id}` - Get review status for a text (Reviewer)
- `POST /submit` - Submit review decisions for all annotations in a text (Reviewer)
- `POST /annotation/{annotation_id}` - Review a specific annotation (Reviewer)
- `GET /annotation/{annotation_id}` - Get reviews for an annotation
- `GET /my-reviews` - Get all reviews by current reviewer (Reviewer)
- `GET /stats` - Get reviewer statistics (Reviewer)
- `GET /annotator/reviewed-work` - Get annotator's reviewed work with feedback (Annotator)
- `GET /annotator/texts-need-revision` - Get texts needing revision by annotator (Annotator)
- `DELETE /{review_id}` - Delete a review (Reviewer, own reviews only)

### Annotation Lists (`/v1/annotation-lists`) (NEW)

- `POST /upload` - Upload hierarchical annotation list JSON file (Admin)
- `GET /` - Get all annotation lists
- `GET /types` - Get all unique annotation list types
- `GET /type/{type_value}` - Get annotation lists by type (hierarchical format)
- `GET /type/{type_value}/flat` - Get annotation lists by type (flat list)
- `DELETE /type/{type_value}` - Delete all annotation lists of a type (Admin)

### Bulk Upload (`/v1/bulk-upload`) (NEW)

- `POST /upload-files` - Upload multiple JSON files for bulk import (Admin)
- `POST /validate-files` - Validate files without importing (dry-run) (Admin)

### Export (`/v1/export`) (NEW)

- `GET /stats` - Get export statistics for date range (Admin)
  - Query params: `from_date`, `to_date`, `filter_type` (reviewed/annotated)
- `GET /download` - Download texts and annotations as ZIP (Admin)
  - Query params: `from_date`, `to_date`, `filter_type` (reviewed/annotated)
  - Returns: ZIP file with individual JSON files

## 🔒 Auth0 Security

### Authentication Flow

1. Frontend authenticates user with Auth0
2. Frontend receives Auth0 access token
3. Frontend sends token in `Authorization: Bearer <token>` header
4. Backend validates token with Auth0 public keys
5. Backend fetches user details from Auth0 userinfo endpoint
6. Backend creates/updates user from Auth0 data
7. Backend authorizes based on user role

### Token Validation

- RSA256 signature verification
- Auth0 userinfo endpoint integration
- Audience and issuer validation
- Expiration time checking
- Automatic public key fetching from Auth0 JWKS

### Role-Based Access

- **Admin**: Full system access including user management, bulk upload, and export
- **Reviewer**: Can review and update text status, view review-related data
- **Annotator**: Can create and manage annotations, view their reviewed work
- **User**: Basic read access and text creation

### Permission Matrix

| Action                  | Admin | Reviewer | Annotator | User |
| ----------------------- | ----- | -------- | --------- | ---- |
| Manage Users            | ✅    | ❌       | ❌        | ❌   |
| Create Texts            | ✅    | ✅       | ✅        | ✅   |
| Review Texts            | ✅    | ✅       | ❌        | ❌   |
| Create Annotations      | ✅    | ✅       | ✅        | ❌   |
| View All Data           | ✅    | ✅       | ✅        | ✅   |
| Bulk Upload             | ✅    | ❌       | ❌        | ❌   |
| Export Data             | ✅    | ❌       | ❌        | ❌   |
| Manage Annotation Lists | ✅    | ❌       | ❌        | ❌   |

## 📊 Usage Examples

### Frontend Integration

```javascript
// Frontend sends Auth0 token
const response = await fetch("/v1/users/me", {
  headers: {
    Authorization: `Bearer ${auth0Token}`,
    "Content-Type": "application/json",
  },
});
```

### Create Text with Translation

```bash
curl -X POST "http://localhost:8000/v1/texts/" \
  -H "Authorization: Bearer <auth0_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sample Tibetan Text",
    "content": "བོད་ཀྱི་ཡིག་ཆ།",
    "translation": "Tibetan document.",
    "language": "bo",
    "source": "Test Document"
  }'
```

### Create Annotation with Level

```bash
curl -X POST "http://localhost:8000/v1/annotations/" \
  -H "Authorization: Bearer <auth0_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text_id": 1,
    "annotation_type": "terminology",
    "start_position": 0,
    "end_position": 11,
    "label": "term_label",
    "name": "technical_term",
    "level": "high",
    "meta": {"category": "religious"},
    "confidence": 0.95
  }'
```

### Review Annotation

```bash
curl -X POST "http://localhost:8000/v1/reviews/annotation/1" \
  -H "Authorization: Bearer <reviewer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "disagree",
    "comment": "The annotation boundaries should be adjusted"
  }'
```

### Submit Complete Review

```bash
curl -X POST "http://localhost:8000/v1/reviews/submit" \
  -H "Authorization: Bearer <reviewer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text_id": 1,
    "decisions": [
      {"annotation_id": 1, "decision": "agree", "comment": null},
      {"annotation_id": 2, "decision": "disagree", "comment": "Incorrect boundary"}
    ]
  }'
```

### Upload Annotation List

```bash
curl -X POST "http://localhost:8000/v1/annotation-lists/upload" \
  -H "Authorization: Bearer <admin_token>" \
  -F "file=@accuracy.json"
```

### Bulk Upload Texts

```bash
curl -X POST "http://localhost:8000/v1/bulk-upload/upload-files" \
  -H "Authorization: Bearer <admin_token>" \
  -F "files=@text1.json" \
  -F "files=@text2.json" \
  -F "files=@text3.json"
```

### Export Data

```bash
curl "http://localhost:8000/v1/export/download?from_date=2024-01-01&to_date=2024-12-31&filter_type=reviewed" \
  -H "Authorization: Bearer <admin_token>" \
  --output export.zip
```

## 🔄 Development

### Database Migrations

The project uses Alembic for database migrations.

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

### Recent Migrations

- **Initial Migration**: Base schema setup
- **Add Annotation Reviews Table**: Review system support
- **Add User Rejected Texts Table**: Text rejection tracking
- **Add Annotation List Table**: Hierarchical category management
- **Add Reviewed Needs Revision Status**: Enhanced review workflow
- **Add Cascade Delete**: Automatic cleanup on deletion
- **Add Annotation Level Field**: Level support for annotations
- **Add Translation Field**: Translation support for texts
- **Add Uploaded By Field**: Track text uploaders
- **Add Title Unique Constraint**: Ensure unique text titles
- **Make Annotator ID Nullable**: Support system annotations

### Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# Run with coverage
pytest --cov=.
```

### Development Setup

1. Enable debug mode in `.env`:
   ```
   DEBUG=true
   LOG_LEVEL=debug
   ```

2. Access debug endpoint:
   ```
   GET /v1/users/debug/auth0
   ```

3. Monitor logs for detailed information

## 📝 Data Formats

### Bulk Upload JSON Format

```json
{
  "text": {
    "title": "Sample Text",
    "content": "Text content here...",
    "translation": "Translation here... (optional)",
    "source": "Source name",
    "language": "en"
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

### Minimal Annotation List JSON Format

```json
{
  "title": "Accuracy Annotations",
  "description": "Accuracy-related annotation categories",
  "categories": [
    {
      "title": "Main Category",
      "level": "1",
      "description": "Category description",
      "subcategories": [
        {
          "title": "Subcategory",
          "level": "2",
          "description": "Subcategory description",
          "subcategories": []
        }
      ]
    }
  ]
}
```

### Export JSON Format

```json
{
  "text": {
    "title": "Text Title",
    "content": "Text content...",
    "translation": "Translation...",
    "language": "en",
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

## 🚨 Troubleshooting

### Common Issues

1. **Auth0 Configuration Error**

   ```
   Error: AUTH0_DOMAIN or AUTH0_AUDIENCE not configured
   Solution: Check .env file and ensure both variables are set correctly
   ```

2. **Token Validation Failed**

   ```
   Error: 401 Unauthorized
   Solution: Ensure Auth0 token is valid and API audience matches
   ```

3. **Database Connection Error**

   ```
   Error: Could not connect to database
   Solution: Check DATABASE_URL in .env and ensure PostgreSQL is running
   ```

4. **Migration Error**

   ```
   Error: Target database is not up to date
   Solution: Run 'alembic upgrade head' to apply pending migrations
   ```

5. **Bulk Upload Validation Failed**
   ```
   Error: Schema validation failed
   Solution: Check JSON format matches expected schema (see Data Formats section)
   ```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# In .env
DEBUG=true
LOG_LEVEL=debug
```

Access debug endpoint:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/v1/users/debug/auth0
```

## 📝 API Documentation

Once the server is running, visit:

- **Interactive API Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

These provide complete API documentation with request/response examples and the ability to test endpoints directly.

## 📦 Dependencies

Key dependencies (see `requirements.txt` for full list):

- **FastAPI** (0.115.14) - Modern web framework
- **SQLAlchemy** (2.0.41) - ORM for database operations
- **Alembic** (1.16.2) - Database migration tool
- **Pydantic** (2.11.7) - Data validation
- **PyJWT** (2.8.0) - JWT token handling
- **psycopg2-binary** (2.9.10) - PostgreSQL adapter
- **python-multipart** (0.0.20) - File upload support
- **uvicorn** (0.35.0) - ASGI server
- **python-dotenv** (1.0.0) - Environment variable management
- **requests** (2.31.0) - HTTP client for Auth0 integration

## 🎯 Workflows

### Annotation Workflow

1. Admin uploads texts via bulk upload or users create texts
2. Annotators view available texts via `/texts/for-annotation`
3. Annotators create annotations with proper boundaries and metadata
4. Text status automatically updates to `annotated` when complete
5. Text becomes available for review

### Review Workflow

1. Reviewers view available texts via `/reviews/texts-for-review`
2. Reviewer starts review session via `/reviews/session/{text_id}`
3. Reviewer evaluates each annotation (agree/disagree with optional comments)
4. Reviewer submits all reviews via `/reviews/submit`
5. System automatically updates text status:
   - `reviewed` if all annotations approved
   - `reviewed_needs_revision` if any disagreements
6. Annotators view feedback via `/reviews/annotator/reviewed-work`
7. Annotators address revisions for texts in `/reviews/annotator/texts-need-revision`

### Export Workflow

1. Admin accesses export statistics via `/export/stats`
2. Admin specifies date range and filter type (reviewed/annotated)
3. System generates ZIP file with individual JSON files per text
4. Admin downloads ZIP file with all texts and annotations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Create migrations if schema changes are required
6. Update API documentation
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For issues and questions:

- Check the troubleshooting section
- Review API documentation at `/docs`
- Enable debug mode for detailed logs
- Check migration status with `alembic current`

---

**Version**: 2.0.0  
**Last Updated**: October 2025  
**Python Version**: 3.8+  
**Database**: PostgreSQL

