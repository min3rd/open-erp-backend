# Open ERP Backend - Microservices Architecture

> **Note**: This is a microservices architecture template. For detailed documentation, see [MICROSERVICES.md](./MICROSERVICES.md).

## 🏗️ Architecture

This project implements a microservices architecture with three services communicating via RabbitMQ:

- **Auth Service** (Port 3001) - Authentication and authorization
- **User Service** (Port 3002) - User management and profiles  
- **Notification Service** (Port 3003) - Email and SMS notifications

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Start all services with RabbitMQ
docker compose up --build

# Or in detached mode
docker compose up -d

# View logs
docker compose logs -f
```

### Local Development

```bash
# Install dependencies
npm install

# Start RabbitMQ
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=admin123 \
  rabbitmq:3.12-management-alpine

# Start services (in separate terminals)
npm run start:auth:dev
npm run start:user:dev
npm run start:notification:dev
```

## 📚 Documentation

- **[MICROSERVICES.md](./MICROSERVICES.md)** - Complete architecture documentation
- **[TESTING.md](./TESTING.md)** - Testing guide and scenarios
- **[.env.example](./.env.example)** - Environment configuration template

## 🔗 Service URLs

After starting with Docker:

- Auth Service: http://localhost:3001
- User Service: http://localhost:3002
- Notification Service: http://localhost:3003
- RabbitMQ Management: http://localhost:15672 (admin/admin123)

## 🧪 Health Checks

```bash
curl http://localhost:3001/auth/health
curl http://localhost:3002/users/health
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
npm run lint                   # Lint code
npm run test                   # Run tests
```

## 🔧 Technology Stack

- **Framework**: NestJS
- **Message Broker**: RabbitMQ
- **Language**: TypeScript
- **Container**: Docker
- **Package Manager**: npm

## 📋 Features

✅ Microservices architecture with three services
✅ Event-driven communication (Publish/Subscribe)
✅ RPC communication (Request/Response)
✅ Retry mechanism with exponential backoff
✅ Dead Letter Queue for failed messages
✅ Docker Compose for easy deployment
✅ Multi-stage Docker builds
✅ TypeScript with strict typing
✅ Comprehensive documentation

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

Please refer to [MICROSERVICES.md](./MICROSERVICES.md) and [TESTING.md](./TESTING.md).

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Run linting and tests
5. Submit a pull request

## 📄 License

UNLICENSED - Private project
