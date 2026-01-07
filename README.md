# Open ERP Backend - Microservices Architecture

> **Note**: This is a microservices architecture template. For detailed documentation, see [MICROSERVICES.md](./docs/MICROSERVICES.md).

## 🏗️ Architecture

This project implements a microservices architecture with three services communicating via RabbitMQ and MongoDB for data persistence:

- **Auth Service** (Port 3001) - Authentication and authorization
- **User Service** (Port 3002) - User management and profiles with MongoDB
- **Notification Service** (Port 3003) - Email and SMS notifications

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Start all services with RabbitMQ and MongoDB
docker compose up --build

# Or in detached mode
docker compose up -d

# View logs
docker compose logs -f

# Run migrations and seed data
npm run db:migrate
npm run db:seed

# Test MongoDB connection
npm run db:test
```

### Local Development

```bash
# Install dependencies
npm install

# Start RabbitMQ
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=admin123 \
  rabbitmq:3.12-management-alpine

# Start MongoDB
docker run -d --name mongodb -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=erp_user \
  -e MONGO_INITDB_ROOT_PASSWORD=erp_password \
  -e MONGO_INITDB_DATABASE=open_erp \
  mongo:7.0

# Run migrations and seed data
npm run db:migrate
npm run db:seed

# Start services (in separate terminals)
npm run start:auth:dev
npm run start:user:dev
npm run start:notification:dev
```

## 📚 Documentation

- **[MICROSERVICES.md](./docs/MICROSERVICES.md)** - Complete architecture documentation
- **[SWAGGER.md](./docs/SWAGGER.md)** - OpenAPI/Swagger documentation setup and usage
- **[MONGODB.md](./docs/MONGODB.md)** - MongoDB setup and usage guide
- **[TESTING.md](./docs/TESTING.md)** - Testing guide and scenarios
- **[.env.example](./.env.example)** - Environment configuration template

## 🔗 Service URLs

After starting with Docker:

- **Docs Aggregator**: http://localhost:3000/docs (Unified API documentation)
- Auth Service: http://localhost:3001 | [API Docs](http://localhost:3001/docs)
- User Service: http://localhost:3002 | [API Docs](http://localhost:3002/docs)
- Notification Service: http://localhost:3003 | [API Docs](http://localhost:3003/docs)
- RabbitMQ Management: http://localhost:15672 (admin/admin123)
- MongoDB: mongodb://localhost:27017 (erp_user/erp_password)

## 🧪 Health Checks

```bash
curl http://localhost:3001/auth/health
curl http://localhost:3002/health
curl http://localhost:3003/notifications/health
```

## 📦 Available Scripts

```bash
npm run build:all              # Build all services
npm run start:auth:dev         # Start auth service (dev mode)
npm run start:user:dev         # Start user service (dev mode)
npm run start:notification:dev # Start notification service (dev mode)
npm run docker:up              # Start all services with Docker
npm run docker:down            # Stop all services
npm run docker:logs            # View Docker logs
npm run db:migrate             # Run database migrations
npm run db:migrate:status      # Check migration status
npm run db:seed                # Seed database with sample data
npm run db:test                # Test MongoDB connection and CRUD
npm run lint                   # Lint code
npm run test                   # Run tests
```

## 🔧 Technology Stack

- **Framework**: NestJS
- **Message Broker**: RabbitMQ
- **Database**: MongoDB with Mongoose ODM
- **Language**: TypeScript
- **Container**: Docker
- **Package Manager**: npm

## 📋 Features

✅ Microservices architecture with three services
✅ Event-driven communication (Publish/Subscribe)
✅ RPC communication (Request/Response)
✅ MongoDB data persistence with Mongoose
✅ Database migrations and seeding
✅ Schema validation and indexing
✅ Soft-delete functionality
✅ Repository pattern for data access
✅ Retry mechanism with exponential backoff
✅ Dead Letter Queue for failed messages
✅ Docker Compose for easy deployment
✅ Multi-stage Docker builds
✅ TypeScript with strict typing
✅ OpenAPI/Swagger documentation for all services
✅ Centralized API documentation aggregator
✅ Comprehensive documentation
✅ User management APIs (global & organization-scoped)
✅ Multi-organization membership management
✅ Role-based access control per organization
✅ Rate limiting on invite endpoints

## 📡 User Management APIs

### Global User Operations

```bash
# Create a new user
POST /api/users
{
  "username": "john_doe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "password": "secure123"
}

# Get user by ID
GET /api/users/:id?include=memberships

# Update user profile
PATCH /api/users/:id
{
  "displayName": "John Smith",
  "phone": "+1234567890"
}

# Delete user (soft delete)
DELETE /api/users/:id

# List/search users
GET /api/users?q=john&page=1&size=10&scope=global
GET /api/users?email=john@example.com
GET /api/users?scope=organization&organizationId=org123
```

### Organization-Scoped User Management

```bash
# Invite/add user to organization
POST /api/organizations/:organizationId/users
{
  "identifier": "john@example.com",  # email or username
  "role": "admin",                   # owner, admin, member, billing
  "sendInviteEmail": true
}

# List organization members
GET /api/organizations/:organizationId/users?role=admin&status=active&page=1&size=10

# Get membership details
GET /api/organizations/:organizationId/users/:userId

# Update membership
PATCH /api/organizations/:organizationId/users/:userId
{
  "role": "member",
  "status": "active"
}

# Remove user from organization
DELETE /api/organizations/:organizationId/users/:userId
```

### RPC Methods (Internal Services)

```typescript
// User lookup methods
RPC_METHODS.USER.GET_USER
RPC_METHODS.USER.FIND_USER_BY_EMAIL
RPC_METHODS.USER.FIND_USER_BY_USERNAME
RPC_METHODS.USER.FIND_USER_BY_ID

// User management methods
RPC_METHODS.USER.CREATE_USER
RPC_METHODS.USER.UPDATE_USER
RPC_METHODS.USER.UPDATE_USER_STATUS

// Organization membership methods
RPC_METHODS.USER.GET_USER_ORGANIZATIONS
RPC_METHODS.USER.ADD_USER_TO_ORGANIZATION
RPC_METHODS.USER.REMOVE_USER_FROM_ORGANIZATION
```

## 🎯 Acceptance Criteria

- [x] `docker compose up` successfully starts RabbitMQ
- [x] All three services start successfully
- [x] RabbitMQ Management UI accessible
- [x] Health endpoints return 200 OK
- [x] User registration triggers welcome email
- [x] Events properly routed through exchanges
- [x] Failed messages move to DLQ
- [x] Services auto-reconnect to RabbitMQ
- [x] RPC calls between services work

## 📖 Learn More

For detailed information about:
- Architecture and design principles
- RabbitMQ configuration
- Communication patterns
- Deployment strategies
- Testing procedures

Please refer to [MICROSERVICES.md](./docs/MICROSERVICES.md) and [TESTING.md](./docs/TESTING.md).

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Run linting and tests
5. Submit a pull request

## 📄 License

UNLICENSED - Private project
