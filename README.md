# Contenedores-básicos - Microservices Architecture

This project implements a microservices-based social media application using Docker containers.

## Architecture

The application consists of 6 main services:

1. **Frontend** (Astro) - Port 4321
   - User interface for the social media app
   - Communicates with all backend services

2. **User Service** (Node.js/Express) - Port 3003
   - User authentication and management
   - Profile picture handling
   - Session management

3. **Posts Service** (Node.js/Express) - Port 3001
   - Post creation and management
   - Image handling for posts
   - Post retrieval

4. **Comments Service** (Python/Flask) - Port 3002
   - Comment creation and management
   - Comment retrieval by post

5. **Messages Service** (Node.js/Express) - Port 3004
   - Private messaging between users
   - Conversation management
   - Unread message tracking

6. **Backend** (Django) - Port 8000
   - Legacy web interface (optional)

7. **Database** (PostgreSQL) - Port 5432
   - Shared database for all services
   - Stores users, posts, comments, and messages

## Quick Start

1. Clone the repository
2. Create a `.env` file with database credentials
3. Run the application:

```bash
docker-compose up --build
```

## Services

### Frontend (http://localhost:4321)
- Main application interface
- User registration and login
- Post creation and viewing
- Comment functionality
- Private messaging

### User Service (http://localhost:3003)
- `/register` - User registration
- `/login` - User login
- `/profile` - User profile
- `/logout` - User logout
- `/profile-picture/<id>` - Profile pictures

### Posts Service (http://localhost:3001)
- `/posts` - Get all posts / Create new post
- `/posts/:id/image` - Get post image
- `/users/:userId/posts` - Get user's posts

### Comments Service (http://localhost:3002)
- `/posts/:postId/comments` - Get/Create comments for a post
- `/users/:userId/comments` - Get user's comments

### Messages Service (http://localhost:3004)
- `/messages` - Send a message
- `/users/:userId/conversations` - Get user's conversations
- `/users/:userId1/messages/:userId2` - Get messages between users
- `/users/:userId/unread-count` - Get unread message count

### Backend API (http://localhost:8000)
- Legacy Django interface (optional)

## Environment Variables

Create a `.env` file with:

```
POSTGRES_DB=proyecto_db
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
DB_HOST=db
DB_PORT=5432
```

## Development

Each service can be developed independently:

- Frontend: `cd frontend && npm run dev`
- User Service: `cd user-service && npm run dev`
- Posts Service: `cd posts-service && npm run dev`
- Comments Service: `cd comments-service && python app.py`
- Messages Service: `cd messages-service && npm run dev`
- Backend: `cd backend && python manage.py runserver`

## Features

- User registration and authentication
- Post creation with image upload
- Commenting system
- Private messaging
- Real-time-like messaging interface
- Responsive design
- Microservices architecture
- Docker containerization
