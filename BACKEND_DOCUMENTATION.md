# Kokzhiek Editor Backend API Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Microservices Architecture](#microservices-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Endpoints](#api-endpoints)
7. [Email Services](#email-services)
8. [Error Handling](#error-handling)
9. [Development Setup](#development-setup)
10. [Deployment](#deployment)

## Project Overview

The Kokzhiek Editor Backend is a **microservice** within the larger Kokzhiek ecosystem. It provides authentication, user management, and content persistence specifically for the book/content editing functionality. This service integrates with other microservices in the Kokzhiek platform to provide a comprehensive educational content management system.

### Key Features
- **Role-based registration system** with 6 distinct user roles
- **Microservice architecture** designed for scalability and integration
- User authentication with email verification and role-specific permissions
- Password reset with email verification
- Book and chapter CRUD operations with role-based access control
- Block-level content management with granular permissions
- Cross-service user management and authorization
- Real-time collaboration support
- File upload and media management
- Role-specific key management system

### User Roles in the Kokzhiek Ecosystem
1. **Admin** - System administrators with full platform access
2. **Moderator** - Content moderators and platform supervisors
3. **Author** - Content creators and book authors
4. **School** - Educational institution administrators
5. **Teacher** - Educators and instructors
6. **Student** - Learners and content consumers

## Microservices Architecture

### Kokzhiek Platform Overview
The Kokzhiek Editor is part of a larger microservices ecosystem designed for educational content management and delivery.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           KOKZHIEK PLATFORM                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Auth Service  │  │ Content Editor  │  │ Learning Portal │  │   Analytics │ │
│  │   (Shared)      │  │ (This Service)  │  │    Service      │  │   Service   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│           │                     │                     │                   │     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Notification    │  │ Assessment      │  │ User Management │  │   Reports   │ │
│  │   Service       │  │   Service       │  │    Service      │  │  Service    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────┤
│                      SHARED INFRASTRUCTURE                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   API Gateway   │  │  Message Queue  │  │   File Storage  │  │ Monitoring  │ │
│  │   (Kong/Nginx)  │  │  (Redis/RabbitMQ)│ │  (S3/Cloudinary)│  │  (Grafana)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Content Editor Service Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Editor Frontend │    │ Content Editor  │    │    Database     │
│    (React)      │◄──►│   Service API   │◄──►│  (PostgreSQL)   │
└─────────────────┘    │   (Node.js)     │    │   (Neon.tech)   │
                       └─────────────────┘    └─────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
             ┌─────────────┐  │  ┌─────────────┐
             │ Auth Service│  │  │File Storage │
             │  (Shared)   │  │  │  Service    │
             └─────────────┘  │  └─────────────┘
                              │
                       ┌─────────────┐
                       │Email Service│
                       │   (SMTP)    │
                       └─────────────┘
```

### Project Structure
```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── models/          # Drizzle schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types
│   └── app.ts           # Express app setup
├── drizzle/             # Database migrations
├── tests/               # Test files
├── .env.example         # Environment variables template
├── package.json
└── tsconfig.json
```

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (via Neon.tech)
- **ORM**: Drizzle ORM
- **Authentication**: JWT + bcrypt
- **Email**: Nodemailer (SMTP)
- **Validation**: Zod
- **Testing**: Jest + Supertest

### Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "drizzle-orm": "^0.29.0",
    "drizzle-kit": "^0.20.0",
    "@neondatabase/serverless": "^0.6.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^6.9.7",
    "zod": "^3.22.4",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "multer": "^1.4.5",
    "uuid": "^9.0.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/nodemailer": "^6.4.14",
    "@types/cors": "^2.8.17",
    "@types/multer": "^1.4.11",
    "typescript": "^5.3.2",
    "ts-node": "^10.9.1",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

## Database Schema

### Registration Keys Table
```sql
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'author', 'school', 'teacher', 'student');

CREATE TABLE registration_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code VARCHAR(255) UNIQUE NOT NULL,
  role user_role NOT NULL, -- Specific role this key grants
  description TEXT,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster role-based queries
CREATE INDEX idx_registration_keys_role ON registration_keys(role);
CREATE INDEX idx_registration_keys_active ON registration_keys(is_active);
```

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  role user_role NOT NULL, -- Uses the ENUM type
  registration_key_id UUID REFERENCES registration_keys(id),
  -- Role-specific metadata
  school_id UUID, -- For school, teacher, student roles
  organization_info JSONB DEFAULT '{}', -- Additional org data for school/admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_email_verified ON users(email_verified);
```

### Schools Table
```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  website_url VARCHAR(255),
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  admin_id UUID REFERENCES users(id), -- School administrator
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint to users table for school_id
ALTER TABLE users
ADD CONSTRAINT fk_users_school
FOREIGN KEY (school_id) REFERENCES schools(id);
```

### Books Table
```sql
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id), -- Optional school association
  is_public BOOLEAN DEFAULT FALSE,
  visibility VARCHAR(50) DEFAULT 'private', -- private, school, public
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for book access control
CREATE INDEX idx_books_owner ON books(owner_id);
CREATE INDEX idx_books_school ON books(school_id);
CREATE INDEX idx_books_visibility ON books(visibility);
```

### Chapters Table
```sql
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, position)
);
```

### Blocks Table
```sql
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  style JSONB DEFAULT '{}',
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chapter_id, position)
);
```

### Book Collaborators Table
```sql
CREATE TABLE book_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- viewer, editor, admin
  invited_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, user_id)
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Media Files Table
```sql
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Authentication & Authorization

### JWT Token Structure
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}
```

### Authentication Flow
1. User registers/logs in with email/password
2. Server validates credentials and generates JWT
3. JWT includes user ID, email, role, and expiration
4. Client stores JWT in localStorage/httpOnly cookie
5. Client sends JWT in Authorization header for protected routes
6. Server validates JWT and extracts user information

### Password Security
- Passwords hashed with bcrypt (salt rounds: 12)
- Minimum password requirements: 8 characters, 1 uppercase, 1 lowercase, 1 number
- Password reset tokens expire after 1 hour
- Account lockout after 5 failed login attempts

### Registration Key System
- Registration requires a valid key provided by super admin
- Keys can have usage limits (single-use or multi-use)
- Keys can have expiration dates
- Keys can be deactivated by admin
- Each registration is tracked to the specific key used

### Role-Based Access Control

#### Role Hierarchy and Permissions

**1. Admin**
- Full platform access across all services
- Can manage all users, schools, and content
- Can create registration keys for all roles
- System configuration and maintenance access
- Can moderate any content globally

**2. Moderator**
- Content moderation across the platform
- Can review, approve, or remove content
- Can manage author accounts and content
- Can access analytics and reporting tools
- Cannot create admin/moderator registration keys

**3. Author**
- Can create and publish books/content
- Content ownership and collaboration management
- Can share content publicly or with schools
- Access to analytics for their own content
- Can create student registration keys for their content

**4. School**
- Organizational account for educational institutions
- Can manage teachers and students within their school
- Can access all content shared with their institution
- Can create teacher and student registration keys
- School-wide analytics and progress tracking
- Content library management for their institution

**5. Teacher**
- Can create educational content and assignments
- Can assign content to their students
- Student progress tracking and assessment
- Can collaborate with other teachers in their school
- Access to school-shared content library

**6. Student**
- Can access assigned and public content
- Progress tracking and assessment participation
- Limited content creation (assignments/projects)
- Cannot create registration keys
- School-scoped access to content

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account using a valid registration key.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "registrationKey": "REG-2024-ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": false,
      "role": "user",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### POST `/api/auth/login`
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    }
  }
}
```

#### POST `/api/auth/logout`
Invalidate user session.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### POST `/api/auth/forgot-password`
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent if account exists"
}
```

#### POST `/api/auth/reset-password`
Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

#### POST `/api/auth/verify-email`
Verify email address using token.

**Request Body:**
```json
{
  "token": "verification_token_from_email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

#### POST `/api/auth/validate-key`
Validate registration key before showing registration form.

**Request Body:**
```json
{
  "registrationKey": "REG-2024-ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration key is valid",
  "data": {
    "keyInfo": {
      "description": "Beta Access Key",
      "usesRemaining": 5,
      "expiresAt": "2024-12-31T23:59:59Z"
    }
  }
}
```

### User Management Endpoints

#### GET `/api/users/profile`
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "avatarUrl": "https://example.com/avatar.jpg",
      "role": "user",
      "emailVerified": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### PUT `/api/users/profile`
Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

#### PUT `/api/users/change-password`
Change user password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewSecurePass123"
}
```

### Books Management Endpoints

#### GET `/api/books`
Get user's books with pagination.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)
- `search`: Search term for title/description
- `sortBy`: Sort field (title, createdAt, updatedAt)
- `sortOrder`: Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "books": [
      {
        "id": "uuid",
        "title": "My Book",
        "description": "Book description",
        "coverImageUrl": "https://example.com/cover.jpg",
        "isPublic": false,
        "owner": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        },
        "chaptersCount": 5,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

#### POST `/api/books`
Create a new book.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "My New Book",
  "description": "Book description",
  "coverImageUrl": "https://example.com/cover.jpg",
  "isPublic": false,
  "settings": {
    "theme": "default",
    "language": "en"
  }
}
```

#### GET `/api/books/:bookId`
Get specific book details.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "book": {
      "id": "uuid",
      "title": "My Book",
      "description": "Book description",
      "coverImageUrl": "https://example.com/cover.jpg",
      "isPublic": false,
      "settings": {},
      "owner": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe"
      },
      "chapters": [
        {
          "id": "uuid",
          "title": "Chapter 1",
          "description": "Chapter description",
          "position": 0,
          "blocksCount": 10,
          "createdAt": "2024-01-01T00:00:00Z"
        }
      ],
      "collaborators": [
        {
          "id": "uuid",
          "user": {
            "id": "uuid",
            "firstName": "Jane",
            "lastName": "Doe",
            "email": "jane@example.com"
          },
          "role": "editor",
          "createdAt": "2024-01-01T00:00:00Z"
        }
      ],
      "permissions": {
        "canEdit": true,
        "canDelete": true,
        "canShare": true
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### PUT `/api/books/:bookId`
Update book details.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Updated Book Title",
  "description": "Updated description",
  "isPublic": true,
  "settings": {
    "theme": "dark"
  }
}
```

#### DELETE `/api/books/:bookId`
Delete a book.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Book deleted successfully"
}
```

### Chapters Management Endpoints

#### GET `/api/books/:bookId/chapters`
Get all chapters in a book.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "chapters": [
      {
        "id": "uuid",
        "title": "Chapter 1",
        "description": "Chapter description",
        "position": 0,
        "settings": {},
        "blocksCount": 10,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### POST `/api/books/:bookId/chapters`
Create a new chapter.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "New Chapter",
  "description": "Chapter description",
  "position": 1,
  "settings": {}
}
```

#### GET `/api/chapters/:chapterId`
Get chapter details with blocks.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "chapter": {
      "id": "uuid",
      "title": "Chapter 1",
      "description": "Chapter description",
      "position": 0,
      "settings": {},
      "book": {
        "id": "uuid",
        "title": "My Book"
      },
      "blocks": [
        {
          "id": "uuid",
          "type": "text",
          "content": {
            "text": "Hello world",
            "html": "<p>Hello world</p>",
            "format": "paragraph"
          },
          "style": {},
          "position": 0,
          "createdAt": "2024-01-01T00:00:00Z",
          "updatedAt": "2024-01-01T00:00:00Z"
        }
      ],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### PUT `/api/chapters/:chapterId`
Update chapter details.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Updated Chapter Title",
  "description": "Updated description",
  "settings": {}
}
```

#### DELETE `/api/chapters/:chapterId`
Delete a chapter.

**Headers:** `Authorization: Bearer <token>`

#### PUT `/api/chapters/:chapterId/reorder`
Reorder chapter position.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "newPosition": 2
}
```

### Blocks Management Endpoints

#### POST `/api/chapters/:chapterId/blocks`
Create a new block.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "type": "text",
  "content": {
    "text": "Hello world",
    "html": "<p>Hello world</p>",
    "format": "paragraph"
  },
  "style": {},
  "position": 0
}
```

#### PUT `/api/blocks/:blockId`
Update block content or style.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": {
    "text": "Updated content",
    "html": "<p>Updated content</p>",
    "format": "paragraph"
  },
  "style": {
    "backgroundColor": "#f0f0f0",
    "textAlign": "center"
  }
}
```

#### DELETE `/api/blocks/:blockId`
Delete a block.

**Headers:** `Authorization: Bearer <token>`

#### PUT `/api/blocks/:blockId/reorder`
Reorder block position.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "newPosition": 3
}
```

#### PUT `/api/chapters/:chapterId/blocks/bulk-update`
Bulk update multiple blocks.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "blocks": [
    {
      "id": "uuid",
      "content": { "text": "Updated" },
      "position": 0
    },
    {
      "id": "uuid",
      "content": { "text": "Another update" },
      "position": 1
    }
  ]
}
```

### Media Management Endpoints

#### POST `/api/media/upload`
Upload media files.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body:** FormData with file field

**Response:**
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "uuid",
      "filename": "image-uuid.jpg",
      "originalName": "my-image.jpg",
      "mimeType": "image/jpeg",
      "size": 1024000,
      "url": "https://storage.example.com/uploads/image-uuid.jpg",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### GET `/api/media`
Get user's uploaded media files.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `type`: Filter by mime type (image, video, audio, document)

#### DELETE `/api/media/:fileId`
Delete uploaded media file.

**Headers:** `Authorization: Bearer <token>`

### Collaboration Endpoints

#### POST `/api/books/:bookId/collaborators`
Invite user to collaborate on book.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "collaborator@example.com",
  "role": "editor"
}
```

#### PUT `/api/books/:bookId/collaborators/:collaboratorId`
Update collaborator role.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "role": "viewer"
}
```

#### DELETE `/api/books/:bookId/collaborators/:collaboratorId`
Remove collaborator.

**Headers:** `Authorization: Bearer <token>`

### Public Content Endpoints

#### GET `/api/public/books/:bookId`
Get public book (no authentication required).

**Response:** Similar to private book endpoint but only for public books.

#### GET `/api/public/chapters/:chapterId`
Get public chapter (no authentication required).

### Admin Registration Key Management Endpoints

#### GET `/api/admin/registration-keys`
Get all registration keys (super admin only).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status (active, expired, exhausted)

**Response:**
```json
{
  "success": true,
  "data": {
    "keys": [
      {
        "id": "uuid",
        "keyCode": "REG-2024-ABC123",
        "description": "Beta Access Key",
        "maxUses": 10,
        "currentUses": 3,
        "usesRemaining": 7,
        "expiresAt": "2024-12-31T23:59:59Z",
        "isActive": true,
        "status": "active",
        "createdBy": {
          "id": "uuid",
          "firstName": "Admin",
          "lastName": "User"
        },
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    }
  }
}
```

#### POST `/api/admin/registration-keys`
Create new registration key (super admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "description": "Beta Access Key for Q1 2024",
  "maxUses": 50,
  "expiresAt": "2024-12-31T23:59:59Z",
  "keyCode": "REG-2024-BETA-Q1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration key created successfully",
  "data": {
    "key": {
      "id": "uuid",
      "keyCode": "REG-2024-BETA-Q1",
      "description": "Beta Access Key for Q1 2024",
      "maxUses": 50,
      "currentUses": 0,
      "expiresAt": "2024-12-31T23:59:59Z",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### GET `/api/admin/registration-keys/:keyId`
Get specific registration key details.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "key": {
      "id": "uuid",
      "keyCode": "REG-2024-ABC123",
      "description": "Beta Access Key",
      "maxUses": 10,
      "currentUses": 3,
      "usesRemaining": 7,
      "expiresAt": "2024-12-31T23:59:59Z",
      "isActive": true,
      "status": "active",
      "usedBy": [
        {
          "userId": "uuid",
          "userEmail": "user1@example.com",
          "registeredAt": "2024-01-15T10:30:00Z"
        },
        {
          "userId": "uuid",
          "userEmail": "user2@example.com",
          "registeredAt": "2024-01-16T14:20:00Z"
        }
      ],
      "createdBy": {
        "id": "uuid",
        "firstName": "Admin",
        "lastName": "User"
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### PUT `/api/admin/registration-keys/:keyId`
Update registration key.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "description": "Updated description",
  "maxUses": 25,
  "expiresAt": "2024-06-30T23:59:59Z",
  "isActive": false
}
```

#### DELETE `/api/admin/registration-keys/:keyId`
Delete registration key (super admin only).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Registration key deleted successfully"
}
```

#### POST `/api/admin/registration-keys/bulk-create`
Create multiple registration keys at once for a specific role.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "role": "teacher",
  "count": 10,
  "description": "Bulk keys for teacher workshop",
  "maxUses": 1,
  "expiresAt": "2024-03-31T23:59:59Z",
  "keyPrefix": "TEACHER-WORKSHOP"
}
```

**Response:**
```json
{
  "success": true,
  "message": "10 teacher registration keys created successfully",
  "data": {
    "keys": [
      "TEACHER-WORKSHOP-001",
      "TEACHER-WORKSHOP-002",
      "TEACHER-WORKSHOP-003"
    ]
  }
}
```

### Role-Specific Registration Examples

#### Student Registration
```json
POST /api/auth/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@school.edu",
  "password": "SecurePass123!",
  "registrationKey": "STUDENT-2024-001"
}
```

#### Teacher Registration
```json
POST /api/auth/register
{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "email": "sarah.johnson@school.edu",
  "password": "TeacherPass456!",
  "registrationKey": "TEACHER-WORKSHOP-001",
  "schoolId": "uuid-school-id"
}
```

#### School Registration
```json
POST /api/auth/register
{
  "firstName": "Michael",
  "lastName": "Smith",
  "email": "admin@oakwoodschool.edu",
  "password": "SchoolAdmin789!",
  "registrationKey": "SCHOOL-LICENSE-001",
  "schoolName": "Oakwood Elementary School",
  "schoolAddress": "123 Education St, Learning City, LC 12345"
}
```

## Email Services

### SMTP Configuration
```typescript
interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}
```

### Email Templates

#### Welcome Email
- Subject: "Welcome to Kokzhiek Editor"
- Template: Welcome message with email verification link
- Variables: `firstName`, `verificationUrl`

#### Email Verification
- Subject: "Verify Your Email Address"
- Template: Email verification instructions
- Variables: `firstName`, `verificationUrl`

#### Password Reset
- Subject: "Reset Your Password"
- Template: Password reset instructions
- Variables: `firstName`, `resetUrl`, `expirationTime`

#### Collaboration Invitation
- Subject: "You've been invited to collaborate"
- Template: Collaboration invitation details
- Variables: `inviterName`, `bookTitle`, `role`, `acceptUrl`

### Email Service Implementation
```typescript
interface EmailService {
  sendWelcomeEmail(email: string, firstName: string, verificationToken: string): Promise<void>;
  sendVerificationEmail(email: string, firstName: string, verificationToken: string): Promise<void>;
  sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<void>;
  sendCollaborationInvite(email: string, inviterName: string, bookTitle: string, role: string, inviteToken: string): Promise<void>;
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Invalid credentials or token
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error
- `FILE_TOO_LARGE`: Upload size limit exceeded
- `UNSUPPORTED_FILE_TYPE`: Invalid file type
- `INVALID_REGISTRATION_KEY`: Registration key is invalid, expired, or exhausted
- `REGISTRATION_KEY_REQUIRED`: Registration key is required for registration
- `KEY_ALREADY_USED`: Registration key has been used by this email address

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `422`: Unprocessable Entity
- `429`: Too Many Requests
- `500`: Internal Server Error

## Microservices Architecture Integration

### Service Discovery & Communication
```typescript
interface ServiceRegistry {
  'user-service': {
    url: string;
    version: string;
    health: '/health';
  };
  'content-service': {
    url: string;
    version: string;
    health: '/health';
  };
  'notification-service': {
    url: string;
    version: string;
    health: '/health';
  };
  'analytics-service': {
    url: string;
    version: string;
    health: '/health';
  };
}
```

### Inter-Service Authentication
```typescript
interface ServiceToken {
  serviceId: string;
  permissions: string[];
  expiresAt: Date;
}

// Service-to-service JWT validation
const validateServiceToken = (token: string): ServiceToken => {
  // Validate and decode service-specific JWT
  return jwt.verify(token, SERVICE_JWT_SECRET) as ServiceToken;
};
```

### Event Bus Integration
```typescript
interface ServiceEvent {
  type: 'USER_REGISTERED' | 'CONTENT_PUBLISHED' | 'SCHOOL_CREATED';
  payload: Record<string, any>;
  sourceService: string;
  timestamp: Date;
  correlationId: string;
}

// Example events emitted by User Service
const userEvents = {
  USER_REGISTERED: {
    userId: string;
    role: UserRole;
    schoolId?: string;
    email: string;
  },
  USER_ROLE_CHANGED: {
    userId: string;
    oldRole: UserRole;
    newRole: UserRole;
    changedBy: string;
  },
  SCHOOL_CREATED: {
    schoolId: string;
    adminUserId: string;
    schoolName: string;
  }
};
```

### API Gateway Configuration
```yaml
# API Gateway routing for User Service
routes:
  - path: /api/auth/*
    service: user-service
    strip_prefix: false

  - path: /api/users/*
    service: user-service
    strip_prefix: false
    auth_required: true

  - path: /api/admin/*
    service: user-service
    strip_prefix: false
    auth_required: true
    roles: [admin, moderator]
```

### Health Check Implementation
```typescript
// Health check endpoint for monitoring
app.get('/health', async (req, res) => {
  const health = {
    service: 'user-service',
    version: process.env.SERVICE_VERSION || '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dependencies: {
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth(),
      smtp: await checkSMTPHealth(),
    }
  };

  res.status(200).json(health);
});
```

### Load Balancing & Scaling
```typescript
interface ServiceInstance {
  id: string;
  url: string;
  weight: number;
  status: 'active' | 'inactive' | 'maintenance';
  lastHealthCheck: Date;
}

// Round-robin load balancing for horizontal scaling
const getServiceInstance = (serviceName: string): ServiceInstance => {
  const instances = serviceRegistry.getInstances(serviceName);
  return loadBalancer.getNext(instances);
};
```

## Development Setup

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database
NEON_DATABASE_URL=your_neon_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
SERVICE_JWT_SECRET=your_service_jwt_secret  # For inter-service communication

# Microservices
SERVICE_NAME=user-service
SERVICE_VERSION=1.0.0
SERVICE_PORT=3001
SERVICE_REGISTRY_URL=http://consul:8500

# Event Bus (Redis/RabbitMQ)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
EVENT_BUS_URL=amqp://localhost:5672

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@kokzhiek.com
FROM_NAME="Kokzhiek Editor"

# File Upload
MAX_FILE_SIZE=10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,audio/mpeg

# Storage
STORAGE_PROVIDER=cloudinary  # or s3
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# CORS
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,https://your-domain.com

# Monitoring
METRICS_PORT=9090
LOG_LEVEL=info
JAEGER_ENDPOINT=http://jaeger:14268/api/traces

# Server
PORT=3000
NODE_ENV=development
```

### Docker Compose for Microservices
```yaml
version: '3.8'
services:
  user-service:
    build: ./user-service
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SERVICE_NAME=user-service
    depends_on:
      - postgres
      - redis
      - consul

  content-service:
    build: ./content-service
    ports:
      - "3002:3002"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SERVICE_NAME=content-service
    depends_on:
      - postgres
      - redis
      - consul

  api-gateway:
    build: ./api-gateway
    ports:
      - "8080:8080"
    environment:
      - CONSUL_URL=http://consul:8500
    depends_on:
      - consul
      - user-service
      - content-service

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: kokzhiek
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  consul:
    image: consul:1.15
    ports:
      - "8500:8500"
    command: consul agent -dev -ui -client=0.0.0.0

volumes:
  postgres_data:
```

## Deployment Strategy

### Production Deployment Checklist
- [ ] Database migrations tested and deployed
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Rate limiting configured
- [ ] Monitoring and logging setup
- [ ] Health checks configured
- [ ] Backup strategy implemented
- [ ] Security headers configured
- [ ] CORS policy verified
- [ ] Service registry configured
- [ ] Load balancer setup
- [ ] CI/CD pipeline configured

### Performance Optimization
- Connection pooling for database
- Redis caching for session management
- CDN for static assets
- Horizontal scaling for high availability
- Database indexing for query optimization
- API response compression
- Request/response logging
- Metrics collection and monitoring

---

**Note**: This documentation covers the User Service within the Kokzhiek microservices architecture. Additional services (Content, Notification, Analytics) will have their own documentation following similar patterns but with service-specific functionality.
```

### Database Migration Commands
```bash
# Generate migration
npm run db:generate

# Apply migrations
npm run db:migrate

# Reset database
npm run db:reset

# Seed database
npm run db:seed

# Create first super admin user (development only)
npm run create-super-admin
```

### Initial Setup
1. **Create Super Admin**: The first user must be created manually with super_admin role
2. **Database Seeding**: Include at least one registration key for initial user registration
3. **Email Testing**: Configure SMTP for development testing

```sql
-- Create first super admin user (run manually after migration)
INSERT INTO users (
  email,
  password_hash,
  first_name,
  last_name,
  role,
  email_verified
) VALUES (
  'admin@kokzhiek.com',
  '$2b$12$hashed_password_here', -- Hash of 'AdminPass123!'
  'Super',
  'Admin',
  'super_admin',
  true
);

-- Create initial registration key
INSERT INTO registration_keys (
  key_code,
  description,
  max_uses,
  created_by
) VALUES (
  'INIT-2024-SETUP',
  'Initial setup key',
  10,
  (SELECT id FROM users WHERE email = 'admin@kokzhiek.com')
);
```

### API Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Deployment

### Environment Setup
1. **Neon.tech Database**: Create PostgreSQL database
2. **SMTP Service**: Configure email provider (Gmail, SendGrid, etc.)
3. **File Storage**: Setup Cloudinary or AWS S3
4. **Domain & SSL**: Configure custom domain with HTTPS

### Deployment Platforms
- **Vercel**: Serverless deployment with edge functions
- **Railway**: Full-stack deployment with database
- **Heroku**: Traditional PaaS deployment
- **AWS**: EC2 with RDS PostgreSQL
- **Docker**: Containerized deployment

### Performance Considerations
- Database connection pooling
- Redis caching for sessions
- CDN for media files
- API response compression
- Request rate limiting
- Database indexing optimization

### Security Checklist
- [ ] HTTPS enforcement
- [ ] CORS configuration
- [ ] Input validation and sanitization
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] Rate limiting
- [ ] Secure headers (Helmet.js)
- [ ] JWT secret rotation
- [ ] Environment variables security
- [ ] Database backup strategy

### Monitoring & Logging
- Request/response logging
- Error tracking (Sentry)
- Performance monitoring
- Database query monitoring
- Email delivery tracking
- User activity analytics

## API Testing

### Example Test Cases
```typescript
// Authentication tests
describe('Auth Endpoints', () => {
  test('POST /api/auth/register - should create new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('test@example.com');
  });

  test('POST /api/auth/login - should authenticate user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });
});
```

This documentation provides a comprehensive foundation for building the Kokzhiek Editor backend API. The structure supports the frontend requirements while providing scalability, security, and maintainability for a production-ready application.