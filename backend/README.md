# Pecha Annotation Tool - Backend API

A comprehensive FastAPI backend for text annotation with Auth0 authentication and role-based access control.

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

- Text creation and management
- Status tracking (Initialized, Annotated, Reviewed)
- Text search and filtering
- Language support
- Source tracking

### 🏷️ Annotation System

- Create annotations with type, position, and metadata
- Position validation and overlap detection
- Annotation statistics and analytics
- Flexible JSON metadata storage
- Confidence scoring

### 📊 Statistics & Analytics

- Text and annotation statistics
- User activity tracking
- Status distribution analytics

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
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
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

6. **Database Setup**

   ```bash
   # Create PostgreSQL database
   createdb pecha_annotation_db

   # Initialize with sample data
   python init_db.py
   ```

7. **Run the Server**

   ```bash
   python main.py
   ```

8. **Test Auth0 Integration**
   ```bash
   # Get an Auth0 access token from your frontend or Auth0 dashboard
   python test_auth0.py --token YOUR_AUTH0_ACCESS_TOKEN
   ```

The API will be available at:

- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/v1/health
- **Auth0 Debug**: http://localhost:8000/api/v1/users/debug/auth0 (dev only)

## 📁 Project Structure

```
backend/
├── main.py              # FastAPI application entry point
├── database.py          # Database configuration
├── deps.py              # Dependency injection
├── auth.py              # Auth0 authentication utilities
├── init_db.py           # Database initialization script
├── test_auth0.py        # Auth0 integration test script
├── models/              # SQLAlchemy models
│   ├── __init__.py
│   ├── user.py          # User model (Auth0 integrated)
│   ├── text.py          # Text model
│   └── annotation.py    # Annotation model
├── schemas/             # Pydantic schemas
│   ├── __init__.py
│   ├── user.py          # User schemas
│   ├── text.py          # Text schemas
│   └── annotation.py    # Annotation schemas
├── crud/                # Database operations
│   ├── __init__.py
│   ├── user.py          # User CRUD
│   ├── text.py          # Text CRUD
│   └── annotation.py    # Annotation CRUD
├── routers/             # API routes
│   ├── __init__.py
│   ├── users.py         # User management routes
│   ├── texts.py         # Text management routes
│   └── annotations.py   # Annotation routes
└── requirements.txt     # Python dependencies
```

## 🔧 Configuration

### Environment Variables

| Variable             | Description                        | Default                                                             |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string       | `postgresql://postgres:password@localhost:5432/pecha_annotation_db` |
| `AUTH0_DOMAIN`       | Your Auth0 domain                  | Required                                                            |
| `AUTH0_API_AUDIENCE` | Your Auth0 API audience identifier | Required                                                            |
| `DEBUG`              | Enable debug mode                  | `false`                                                             |
| `LOG_LEVEL`          | Logging level                      | `info`                                                              |

### Database Models

#### User Model

- Roles: `admin`, `user`, `annotator`, `reviewer`
- Fields: auth0_user_id, username, email, full_name, role, is_active
- Relationships: annotations, reviewed_texts
- **Auth0 Integration**: Users are automatically created from Auth0 tokens

#### Text Model

- Status: `initialized`, `annotated`, `reviewed`
- Fields: title, content, source, language, status, reviewer_id
- Relationships: annotations, reviewer

#### Annotation Model

- Fields: type, start/end positions, selected_text, label, meta (JSON), confidence
- Relationships: text, annotator
- Validation: position bounds, overlap detection

## 🛠️ API Endpoints

### Users (`/api/v1/users`)

- `GET /me` - Get current user
- `PUT /me` - Update current user
- `GET /` - List users (Admin)
- `GET /{id}` - Get user by ID (Admin)
- `PUT /{id}` - Update user (Admin)
- `DELETE /{id}` - Delete user (Admin)
- `GET /search/` - Search users (Admin)

### Texts (`/api/v1/texts`)

- `GET /` - List texts with filtering
- `POST /` - Create text
- `GET /for-annotation` - Get texts for annotation
- `GET /for-review` - Get texts for review (Reviewer)
- `GET /stats` - Get text statistics
- `GET /search/` - Search texts
- `GET /{id}` - Get text by ID
- `GET /{id}/with-annotations` - Get text with annotations
- `PUT /{id}` - Update text
- `PUT /{id}/status` - Update text status (Reviewer)
- `DELETE /{id}` - Delete text (Admin)

### Annotations (`/api/v1/annotations`)

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

- **Admin**: Full system access
- **Reviewer**: Can review and update text status
- **Annotator**: Can create and manage annotations
- **User**: Basic read access

### Permission Matrix

| Action             | Admin | Reviewer | Annotator | User |
| ------------------ | ----- | -------- | --------- | ---- |
| Manage Users       | ✅    | ❌       | ❌        | ❌   |
| Create Texts       | ✅    | ✅       | ✅        | ✅   |
| Review Texts       | ✅    | ✅       | ❌        | ❌   |
| Create Annotations | ✅    | ✅       | ✅        | ❌   |
| View All Data      | ✅    | ✅       | ✅        | ✅   |

## 📊 Usage Examples

### Frontend Integration

```javascript
// Frontend sends Auth0 token
const response = await fetch("/api/v1/users/me", {
  headers: {
    Authorization: `Bearer ${auth0Token}`,
    "Content-Type": "application/json",
  },
});
```

### Create Text

```bash
curl -X POST "http://localhost:8000/api/v1/texts/" \
  -H "Authorization: Bearer <auth0_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sample Text",
    "content": "This is content to be annotated.",
    "language": "en",
    "source": "Test Document"
  }'
```

### Create Annotation

```bash
curl -X POST "http://localhost:8000/api/v1/annotations/" \
  -H "Authorization: Bearer <auth0_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text_id": 1,
    "annotation_type": "entity",
    "start_position": 0,
    "end_position": 11,
    "label": "sample_entity",
    "meta": {"confidence": 95}
  }'
```

## 🧪 Default Test Data

After running `python init_db.py`, you'll have:

### Sample Users (with Auth0 IDs)

- **admin**: `auth0|admin_user_id`
- **annotator1**: `auth0|annotator_user_id`
- **reviewer1**: `auth0|reviewer_user_id`
- **user1**: `auth0|regular_user_id`

### Sample Texts

- Tibetan text sample
- English text sample
- Mixed language text sample

### Sample Annotations

- Entity annotations on Tibetan text
- Sentiment annotations on English text

## 🧪 Testing Auth0 Integration

### Test Script

Use the included test script to verify your Auth0 setup:

```bash
# Basic test
python test_auth0.py --token YOUR_AUTH0_ACCESS_TOKEN

# Skip backend tests (if backend is not running)
python test_auth0.py --token YOUR_TOKEN --skip-backend
```

### What the Test Script Checks

1. **Environment Variables**: AUTH0_DOMAIN and AUTH0_API_AUDIENCE
2. **Auth0 JWKS Endpoint**: Verifies public key accessibility
3. **Auth0 UserInfo Endpoint**: Tests token validation with Auth0
4. **Backend Health**: Checks if backend is configured correctly
5. **Backend Authentication**: Tests full auth flow
6. **Debug Endpoint**: Validates detailed token information

### Debug Endpoints (Development Only)

- **Auth0 Debug**: `GET /api/v1/users/debug/auth0`
  - Only available when `DEBUG=true`
  - Shows token validation details
  - Displays Auth0 configuration status

### Manual Testing

```bash
# Test with curl
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/v1/users/me

# Health check with Auth0 status
curl http://localhost:8000/api/v1/health
```

## 🚨 Troubleshooting

### Common Issues

1. **Auth0 Configuration Error**

   ```
   Solution: Check AUTH0_DOMAIN and AUTH0_API_AUDIENCE in .env file
   ```

2. **Token Validation Failed**

   ```
   Solution: Ensure Auth0 token is valid and API audience matches
   ```

3. **JWKS Fetch Error**

   ```
   Solution: Check Auth0 domain and internet connectivity
   ```

4. **User Not Found**
   ```
   Solution: Verify Auth0 user ID format and database connection
   ```

### Debug Mode

Enable debug mode by setting `DEBUG=true` in `.env` for detailed logging.

## 🔄 Development

### Auth0 Setup

1. Create Auth0 application (SPA or Regular Web App)
2. Create API in Auth0 dashboard
3. Configure allowed callbacks and origins
4. Set environment variables in `.env`

### Database Migrations

```bash
# Install alembic (already in requirements.txt)
pip install alembic

# Initialize migrations (first time only)
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head
```

### Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

## 📝 API Documentation

Once the server is running, visit:

- **Interactive API Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

These provide complete API documentation with request/response examples and the ability to test endpoints directly.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
