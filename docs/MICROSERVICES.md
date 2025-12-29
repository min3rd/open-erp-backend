# Open ERP Backend - Microservices Architecture

This is the backend for the Open ERP system, built using a microservices architecture with NestJS and RabbitMQ as the message broker.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Microservices](#microservices)
- [RabbitMQ Configuration](#rabbitmq-configuration)
- [Getting Started](#getting-started)
- [Development](#development)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Communication Patterns](#communication-patterns)
- [Testing](#testing)
- [Production Deployment](#production-deployment)

## Architecture Overview

The system follows a microservices architecture where each service is independently deployable and communicates with others through RabbitMQ message broker.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   Auth      │     │    User     │     │   Notification      │
│  Service    │────▶│  Service    │────▶│     Service         │
│  (Port 3001)│     │ (Port 3002) │     │    (Port 3003)      │
└─────────────┘     └─────────────┘     └─────────────────────┘
       │                    │                      │
       │                    │                      │
       └────────────────────┴──────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   RabbitMQ     │
                    │ Message Broker │
                    │  (Port 5672)   │
                    │ Management UI  │
                    │  (Port 15672)  │
                    └────────────────┘
```

### Design Principles

- **Loose Coupling**: Services communicate through events and RPC calls
- **Single Responsibility**: Each service handles a specific domain
- **Independent Deployment**: Services can be deployed independently
- **Resilience**: Retry mechanisms, dead letter queues, and exponential backoff
- **Scalability**: Services can be scaled horizontally

## Microservices

### 1. Auth Service (Port 3001)

**Responsibilities:**
- User authentication (login/logout)
- User registration
- Token management
- Password management

**Events Published:**
- `auth.user.registered` - When a new user registers
- `auth.user.login` - When a user logs in
- `auth.user.logout` - When a user logs out
- `auth.password.changed` - When a user changes password

**RPC Methods:**
- None (for now)

### 2. User Service (Port 3002)

**Responsibilities:**
- User profile management (CRUD operations)
- User data storage
- User query operations

**Events Published:**
- `user.created` - When a new user is created
- `user.updated` - When a user is updated
- `user.deleted` - When a user is deleted
- `user.profile.updated` - When user profile is updated

**Events Consumed:**
- `auth.user.registered` - To create user profile after registration
- `auth.user.login` - To track user login activities

**RPC Methods:**
- `getUser` - Get user by ID
- `getUserByEmail` - Get user by email

### 3. Notification Service (Port 3003)

**Responsibilities:**
- Email notifications
- SMS notifications
- Push notifications (future)

**Events Published:**
- `notification.email.sent` - When an email is sent
- `notification.sms.sent` - When an SMS is sent
- `notification.push.sent` - When a push notification is sent

**Events Consumed:**
- `auth.user.registered` - Send welcome email to new users
- `user.created` - Send notification about new user
- `user.updated` - Send notification about profile changes

**RPC Methods:**
- `sendNotification` - Send notification via specified channel

## RabbitMQ Configuration

### Exchanges

1. **erp.events** (Topic Exchange)
   - Used for event-driven communication
   - Allows pattern-based routing with wildcards
   - Durable: Yes

2. **erp.rpc** (Direct Exchange)
   - Used for RPC request/response patterns
   - Direct routing to specific queues
   - Durable: Yes

3. **erp.dlx** (Topic Exchange)
   - Dead Letter Exchange for failed messages
   - Stores messages that couldn't be processed
   - Durable: Yes

### Queues

Each service has three queues:

1. **{service}.events** - For consuming events
2. **{service}.rpc** - For handling RPC requests
3. **{service}.dlx** - Dead letter queue for failed messages

### Routing Keys

Events follow the pattern: `{service}.{entity}.{action}`

Examples:
- `auth.user.registered`
- `user.profile.updated`
- `notification.email.sent`

RPC routing keys: `rpc.{service}`

### Retry & Backoff Strategy

- **Max Retries**: 3 attempts
- **Initial Delay**: 1 second
- **Max Delay**: 30 seconds
- **Backoff Multiplier**: 2 (exponential backoff)
- **Dead Letter TTL**: 60 seconds

## Getting Started

### Prerequisites

- Node.js 20+ 
- npm or yarn
- Docker & Docker Compose (for containerized deployment)
- RabbitMQ (if running locally without Docker)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd open-erp-backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration

## Development

### Running Services Locally

You need to have RabbitMQ running locally or use Docker.

#### Option 1: Run RabbitMQ with Docker
```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin123 \
  rabbitmq:3.12-management-alpine
```

#### Option 2: Run all services in development mode

Terminal 1 - Auth Service:
```bash
npm run start:auth:dev
```

Terminal 2 - User Service:
```bash
npm run start:user:dev
```

Terminal 3 - Notification Service:
```bash
npm run start:notification:dev
```

### Building Services

Build all services:
```bash
npm run build:all
```

Build individual services:
```bash
npm run build:auth
npm run build:user
npm run build:notification
```

### Available Scripts

- `npm run start:auth:dev` - Start auth service in watch mode
- `npm run start:user:dev` - Start user service in watch mode
- `npm run start:notification:dev` - Start notification service in watch mode
- `npm run build:all` - Build all services
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests

## Docker Deployment

### Quick Start

The easiest way to run the entire system is using Docker Compose:

```bash
# Build and start all services
docker compose up --build

# Or run in detached mode
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

### Using npm scripts:

```bash
npm run docker:build  # Build Docker images
npm run docker:up     # Start all services
npm run docker:down   # Stop all services
npm run docker:logs   # View logs
```

### Accessing Services

After starting with Docker Compose:

- **Auth Service**: http://localhost:3001
- **User Service**: http://localhost:3002
- **Notification Service**: http://localhost:3003
- **RabbitMQ Management**: http://localhost:15672 (username: admin, password: admin123)

### Health Checks

Each service provides a health endpoint:

```bash
curl http://localhost:3001/auth/health
curl http://localhost:3002/health
curl http://localhost:3003/notifications/health
```

## Environment Variables

See `.env.example` for all available configuration options.

### Required Variables

```env
# RabbitMQ Connection
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_USER=admin
RABBITMQ_PASS=admin123

# Service Ports
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
NOTIFICATION_SERVICE_PORT=3003
```

### Optional Variables

```env
# RabbitMQ Advanced
RABBITMQ_VHOST=/
RABBITMQ_HEARTBEAT=30
RABBITMQ_PREFETCH=10
RABBITMQ_CONNECTION_TIMEOUT=10000

# Retry Configuration
MAX_RETRY_ATTEMPTS=3
RETRY_INITIAL_DELAY=1000
RETRY_MAX_DELAY=30000
RETRY_BACKOFF_MULTIPLIER=2
```

## API Documentation

### Auth Service (3001)

#### POST /auth/register
Register a new user

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "1234567890",
    "username": "john_doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /auth/login
Authenticate user

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "session": {
    "token": "jwt-token-here",
    "userId": "1234567890",
    "expiresIn": 3600
  }
}
```

### User Service (3002)

#### GET /users
Get all users

#### GET /users/:id
Get user by ID

#### POST /users
Create a new user

#### PUT /users/:id
Update user

#### DELETE /users/:id
Delete user

### Notification Service (3003)

#### POST /notifications/email
Send email notification

**Request:**
```json
{
  "to": "user@example.com",
  "subject": "Welcome!",
  "body": "Welcome to Open ERP"
}
```

#### POST /notifications/sms
Send SMS notification

**Request:**
```json
{
  "to": "+1234567890",
  "message": "Your verification code is 123456"
}
```

## Communication Patterns

### Event-Driven (Publish/Subscribe)

Services publish events when important actions occur. Other services can subscribe to these events.

**Example: User Registration Flow**

1. Client sends POST to `/auth/register`
2. Auth service creates user account
3. Auth service publishes `auth.user.registered` event
4. User service receives event and creates user profile
5. Notification service receives event and sends welcome email

### RPC (Request/Response)

Services can request data from other services synchronously.

**Example: Getting User Details**

```typescript
// From any service
const user = await rabbitMQClient.sendRPCRequest(
  RABBITMQ_EXCHANGES.RPC,
  RABBITMQ_ROUTING_KEYS.RPC_USER,
  'getUser',
  { userId: '12345' },
  30000 // timeout
);
```

## Testing

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Acceptance Criteria Checklist

- [ ] `docker-compose up` successfully starts RabbitMQ
- [ ] All three services (auth, user, notification) start successfully
- [ ] RabbitMQ Management UI is accessible at http://localhost:15672
- [ ] Health endpoints return 200 OK for all services
- [ ] User registration triggers welcome email (check notification service logs)
- [ ] Events are properly routed through RabbitMQ exchanges
- [ ] Failed messages are moved to Dead Letter Queue after max retries
- [ ] Services automatically reconnect to RabbitMQ if connection is lost
- [ ] RPC calls between services work correctly
- [ ] Service logs show proper event handling

## Production Deployment

### Staging Environment

For staging deployment:

1. Set appropriate environment variables:
```env
NODE_ENV=production
RABBITMQ_URL=amqps://your-staging-rabbitmq:5671
# ... other variables
```

2. Build Docker images:
```bash
docker compose -f docker-compose.yml -f docker-compose.staging.yml build
```

3. Deploy to staging:
```bash
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

### Production Environment

For production deployment:

1. Use managed RabbitMQ service (CloudAMQP, AWS MQ, etc.)
2. Set up proper monitoring and logging
3. Configure horizontal scaling for services
4. Use Kubernetes for orchestration (optional)
5. Set up API Gateway (optional)

### Kubernetes Deployment (Optional)

For Kubernetes deployment, you'll need to create:

1. Deployment manifests for each service
2. Service definitions
3. ConfigMaps for environment variables
4. Secrets for sensitive data
5. Ingress for external access

Example structure:
```
k8s/
├── auth-deployment.yaml
├── user-deployment.yaml
├── notification-deployment.yaml
├── rabbitmq-statefulset.yaml
├── configmap.yaml
└── secrets.yaml
```

### Monitoring & Observability

Future considerations:

- **Logging**: Centralized logging with ELK stack or similar
- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry, Jaeger
- **Health Checks**: Kubernetes liveness/readiness probes
- **Alerts**: Set up alerts for service failures, queue backlogs

## References

- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com)
- [OpenTelemetry](https://opentelemetry.io/docs/)

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Run linting and tests
5. Submit a pull request

## License

UNLICENSED - Private project

---

For questions or issues, please contact the development team.
