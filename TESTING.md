# Testing Guide for Microservices

This guide provides instructions for testing the microservices architecture.

## Prerequisites

- Docker and Docker Compose installed
- curl or Postman for API testing
- Access to RabbitMQ Management UI

## Quick Test Checklist

### 1. Start All Services

```bash
# Build and start services
docker compose up --build

# Or use npm script
npm run docker:up
```

Expected output:
- RabbitMQ starts and shows "Server startup complete"
- Auth service logs: "Auth service is running on port 3001"
- User service logs: "User service is running on port 3002"  
- Notification service logs: "Notification service is running on port 3003"
- Each service logs: "RabbitMQ setup complete"

### 2. Verify Service Health

Test each service's health endpoint:

```bash
# Auth Service
curl http://localhost:3001/auth/health
# Expected: {"status":"ok","service":"auth"}

# User Service
curl http://localhost:3002/health
# Expected: {"status":"ok","service":"user"}

# Notification Service
curl http://localhost:3003/notifications/health
# Expected: {"status":"ok","service":"notification"}
```

### 3. Access RabbitMQ Management UI

Open in browser: http://localhost:15672

- Username: `admin`
- Password: `admin123`

Verify:
- [ ] Exchanges created: `erp.events`, `erp.rpc`, `erp.dlx`
- [ ] Queues created for each service (events, rpc, dlx)
- [ ] Bindings are configured correctly

### 4. Test Event-Driven Communication

#### Test User Registration Flow

```bash
# Register a new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

Expected behavior:
1. Auth service responds with success message
2. Auth service publishes `auth.user.registered` event
3. User service receives event and creates user profile (check logs)
4. Notification service receives event and sends welcome email (check logs)

Check the logs:
```bash
docker compose logs -f user-service
docker compose logs -f notification-service
```

You should see:
- User service: "Received event: user.registered"
- User service: "New user registered: ..."
- Notification service: "Received event: user.registered"
- Notification service: "Sending welcome email to new user: ..."

### 5. Test RPC Communication

From the user service, you can make RPC calls. To test this manually, you'll need to trigger the RPC functionality through the code.

Alternatively, check the logs to see if RPC handling is working:
```bash
docker compose logs notification-service
```

### 6. Test Retry and DLX

To test retry mechanism and dead letter queue:

1. Stop the notification service:
```bash
docker compose stop notification-service
```

2. Register a new user (event will fail to process by notification service)

3. Start notification service again:
```bash
docker compose start notification-service
```

4. Check RabbitMQ Management UI to see if messages moved to DLX after retries

### 7. Test Service Restart and Reconnection

Stop and start individual services to test reconnection:

```bash
# Stop auth service
docker compose stop auth-service

# Start auth service
docker compose start auth-service

# Check logs - should see reconnection messages
docker compose logs auth-service
```

## Manual Testing Scenarios

### Scenario 1: Complete User Registration Flow

1. Register user via Auth service
2. Verify user created in User service
3. Check notification sent via Notification service

```bash
# 1. Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securepass123"
  }'

# 2. Check users (User service should have stored the user)
curl http://localhost:3002/users

# 3. Check logs for notification
docker compose logs notification-service | grep "john@example.com"
```

### Scenario 2: User Login Event

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123"
  }'

# Check User service logs for login event
docker compose logs user-service | grep "logged in"
```

### Scenario 3: User CRUD Operations

```bash
# Create user
curl -X POST http://localhost:3002/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane_doe",
    "email": "jane@example.com"
  }'

# Get all users
curl http://localhost:3002/users

# Get specific user (replace {id} with actual ID from previous response)
curl http://localhost:3002/users/{id}

# Update user
curl -X PUT http://localhost:3002/users/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane_updated"
  }'

# Delete user
curl -X DELETE http://localhost:3002/users/{id}

# Check Notification service logs - should see event notifications
docker compose logs notification-service
```

### Scenario 4: Direct Notification

```bash
# Send email
curl -X POST http://localhost:3003/notifications/email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Test Email",
    "body": "This is a test email"
  }'

# Send SMS
curl -X POST http://localhost:3003/notifications/sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "This is a test SMS"
  }'
```

## Monitoring & Debugging

### View All Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f auth-service
docker compose logs -f user-service
docker compose logs -f notification-service
docker compose logs -f rabbitmq
```

### Check RabbitMQ Queues

In RabbitMQ Management UI (http://localhost:15672):

1. Go to "Queues" tab
2. Check message rates
3. Look for any messages in DLX queues
4. Check consumer counts

### Common Issues

#### Services can't connect to RabbitMQ

- Check if RabbitMQ is running: `docker compose ps`
- Check RabbitMQ logs: `docker compose logs rabbitmq`
- Verify network connectivity: `docker compose exec auth-service ping rabbitmq`

#### Events not being received

- Check queue bindings in RabbitMQ Management UI
- Verify routing keys match
- Check consumer count on queues (should be > 0)
- Look at service logs for errors

#### Build failures

- Ensure all dependencies are installed: `npm install`
- Try cleaning: `rm -rf dist node_modules && npm install`
- Check TypeScript errors: `npm run build:all`

## Automated Testing (Future)

For automated testing, consider:

1. Integration tests using Jest
2. End-to-end tests for complete flows
3. Load testing with tools like k6 or Artillery
4. Contract testing for microservices communication

## Cleanup

```bash
# Stop and remove containers, networks, volumes
docker compose down -v

# Remove built images
docker compose down --rmi all -v
```

## Success Criteria

✅ All services start without errors
✅ All health endpoints return OK
✅ RabbitMQ exchanges and queues are created
✅ User registration triggers welcome email
✅ User events are received by notification service
✅ Services reconnect automatically after restart
✅ Messages are retried on failure
✅ Failed messages end up in DLX after max retries

## Next Steps

After verifying the template works:

1. Implement actual database integration
2. Add proper authentication/authorization
3. Implement real email/SMS sending
4. Add more comprehensive error handling
5. Set up monitoring and alerting
6. Add API documentation (Swagger/OpenAPI)
7. Implement unit and integration tests
