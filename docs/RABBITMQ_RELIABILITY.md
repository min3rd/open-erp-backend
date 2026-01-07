# RabbitMQ Reliability Improvements

This document describes the reliability improvements made to prevent microservices from stopping message processing.

## Problem Statement

Previously, microservices would occasionally stop processing RabbitMQ messages after running for some time. Messages would pile up in queues (unacked or unprocessed), but services would appear to be running normally. This required manual service restarts to resume processing.

## Root Causes Identified

1. **No heartbeat configuration**: Connection failures weren't detected quickly enough
2. **No reconnection strategy**: Services didn't automatically reconnect after connection loss
3. **No health monitoring**: No way to detect when RabbitMQ connection was down
4. **Unhandled exceptions**: Errors could crash services silently
5. **No prefetch tuning**: Default settings could cause head-of-line blocking

## Solutions Implemented

### 1. Enhanced Connection Configuration

**File**: `libs/shared/config/rabbitmq.config.ts`, `libs/shared/rabbitmq/rabbitmq-microservice.config.ts`

- **Heartbeat**: Set to 30 seconds (configurable via `RABBITMQ_HEARTBEAT`)
  - Detects stale connections and triggers reconnection
  - Both client and server exchange heartbeat frames

- **Socket Options**: Added reconnection settings
  - `reconnectTimeInSeconds`: 5 seconds (configurable via `RABBITMQ_RECONNECT_TIME`)
  - Automatic reconnection on connection loss

- **Prefetch Count**: Set to 10 (configurable via `RABBITMQ_PREFETCH`)
  - Limits unacknowledged messages per consumer
  - Prevents head-of-line blocking
  - Lower values (5-10) for critical services
  - Higher values (20-50) for high-throughput services

- **Manual Acknowledgment**: `noAck: false`
  - Messages must be explicitly acknowledged
  - Prevents message loss on processing failures
  - Messages are requeued on consumer failure

- **Dead Letter Exchange**: Configured for all queues
  - Failed messages route to DLX after max retries
  - Prevents poison messages from blocking queues

#### Environment Variables

```bash
# Heartbeat interval in seconds (default: 30)
RABBITMQ_HEARTBEAT=30

# Prefetch count (default: 10)
RABBITMQ_PREFETCH=10

# Reconnection time in seconds (default: 5)
RABBITMQ_RECONNECT_TIME=5

# Message handler timeout in milliseconds (default: 30000)
RABBITMQ_HANDLER_TIMEOUT=30000
```

### 2. Global Error Handlers

**File**: `libs/shared/rabbitmq/rabbitmq-microservice.config.ts`

Added process-level error handlers to prevent silent crashes:

```typescript
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Log and continue - let orchestrator handle restarts
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
  // Log and continue - let orchestrator handle restarts
});
```

### 3. Health Check Endpoints

**Files**: 
- `libs/shared/rabbitmq/rabbitmq-health.indicator.ts`
- `apps/user/src/health.controller.ts`
- `apps/notification/src/health.controller.ts`

Added three health endpoints per service:

#### `/health` - Basic Health Check
- Simple status check
- Always returns 200 if process is running

#### `/health/live` - Liveness Probe
- Indicates if the service process is alive
- Used by Kubernetes to restart crashed containers
- Returns 200 if process is responsive

#### `/health/ready` - Readiness Probe  
- Indicates if the service is ready to accept traffic
- Checks RabbitMQ connection status
- Returns 200 if RabbitMQ is connected
- Returns 503 if RabbitMQ is disconnected
- Used by Kubernetes to route traffic

**Example Usage:**

```bash
# Check if service is alive
curl http://localhost:3002/health/live

# Check if service is ready (RabbitMQ connected)
curl http://localhost:3002/health/ready
```

### 4. Docker Health Checks

**File**: `docker-compose.yml`

Added health checks for all microservices:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3002/health/ready"]
  interval: 30s      # Check every 30 seconds
  timeout: 10s       # Fail if check takes > 10s
  retries: 3         # Allow 3 failures before marking unhealthy
  start_period: 40s  # Grace period for startup
```

Docker will automatically restart unhealthy containers.

### 5. Connection Monitoring

**File**: `libs/shared/rabbitmq/rabbitmq-health.indicator.ts`

Tracks connection state with:
- Last check time
- Last connected time
- Last disconnected time
- Consecutive failure count

Health indicator is marked as healthy after successful microservice connection.

## Usage Guide

### For Developers

#### Creating New Microservices

Use the helper function for consistent configuration:

```typescript
import {
  createRabbitMQMicroserviceOptions,
  setupGlobalErrorHandlers,
  RabbitMQHealthIndicator,
} from '@shared/rabbitmq';

// In bootstrap()
setupGlobalErrorHandlers('MyService');

const microserviceOptions = createRabbitMQMicroserviceOptions({
  queueName: 'my_queue',
  serviceName: 'MyService',
});

app.connectMicroservice(microserviceOptions);
await app.startAllMicroservices();

// Mark as healthy after connection
const healthIndicator = app.get(RabbitMQHealthIndicator);
healthIndicator.markAsHealthy();
```

#### Adding Health Checks to Modules

```typescript
import { TerminusModule } from '@nestjs/terminus';
import { RabbitMQHealthIndicator } from '@shared/rabbitmq';

@Module({
  imports: [TerminusModule],
  providers: [
    {
      provide: RabbitMQHealthIndicator,
      useFactory: () => new RabbitMQHealthIndicator('MyService'),
    },
  ],
})
export class MyModule {}
```

### For Operations

#### Monitoring Service Health

```bash
# Check all services
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # User
curl http://localhost:3003/health  # Notification

# Check readiness (RabbitMQ connection)
curl http://localhost:3002/health/ready
```

#### Docker Compose Health Status

```bash
# View health status
docker-compose ps

# View health check logs
docker inspect --format='{{json .State.Health}}' erp-user-service | jq
```

#### RabbitMQ Management UI

Access at `http://localhost:15672` (admin/admin123)

Monitor:
- **Connections**: Should show one per service
- **Channels**: Check for active channels
- **Queues**: Monitor message rates and unacked counts
- **Consumers**: Verify each queue has active consumers

Key metrics to watch:
- **Unacked messages**: Should stay low (< prefetch count)
- **Message rate**: Should be steady under load
- **Consumer count**: Should match number of service instances

### Kubernetes Deployment

Add probes to deployment manifests:

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3002
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3002
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

## Testing

### Connection Resilience Test

1. Start services: `docker-compose up -d`
2. Verify connections: `curl http://localhost:3002/health/ready`
3. Stop RabbitMQ: `docker stop erp-rabbitmq`
4. Check health: `curl http://localhost:3002/health/ready` (should return 503)
5. Start RabbitMQ: `docker start erp-rabbitmq`
6. Wait for reconnection (5-10 seconds)
7. Check health: `curl http://localhost:3002/health/ready` (should return 200)

### Load Test

Send multiple RPC requests to verify message processing:

```bash
# Install dependencies
npm install

# Run load test (example using curl)
for i in {1..100}; do
  curl -X POST http://localhost:3002/users \
    -H "Content-Type: application/json" \
    -d '{"name":"user'$i'","email":"user'$i'@example.com"}' &
done
wait

# Monitor RabbitMQ
# - Check queue depths in management UI
# - Verify messages are being processed
# - Monitor unacked message count
```

## Troubleshooting

### Service Not Processing Messages

1. **Check health endpoint**:
   ```bash
   curl http://localhost:3002/health/ready
   ```

2. **Check RabbitMQ connection**:
   - Go to http://localhost:15672
   - Check Connections tab for service
   - Verify channel is open

3. **Check logs**:
   ```bash
   docker logs erp-user-service --tail 100
   ```
   Look for:
   - Connection errors
   - Unhandled exceptions
   - Message processing errors

4. **Check queue status**:
   - Unacked messages > prefetch? (head-of-line blocking)
   - Messages in queue but no consumers? (consumer crashed)
   - Dead letter queue filling up? (poison messages)

### High Unacked Message Count

Possible causes:
- Handler processing too slowly
- Handler hanging or blocking
- Prefetch too high

Solutions:
- Lower `RABBITMQ_PREFETCH`
- Optimize handler performance
- Add handler timeout
- Scale horizontally (more instances)

### Frequent Reconnections

Check logs for connection errors:
```bash
docker logs erp-user-service | grep -i "connection\|reconnect"
```

Possible causes:
- Network instability
- Heartbeat timeout too low
- Resource constraints

Solutions:
- Increase `RABBITMQ_HEARTBEAT`
- Check network latency
- Monitor CPU/memory usage

## Metrics to Monitor

### Service Metrics (Future Enhancement)

Consider adding Prometheus metrics:

- `rmq_connection_up`: 1 if connected, 0 if not
- `rmq_messages_processed_total`: Counter of processed messages
- `rmq_message_processing_duration_seconds`: Histogram of processing times
- `rmq_message_errors_total`: Counter of processing errors
- `rmq_queue_unacked_messages`: Gauge of unacked messages

### RabbitMQ Metrics

Available in management UI:
- Message rate (publish/deliver/ack)
- Queue length
- Unacked messages
- Consumer count
- Connection count
- Channel count

## References

- [NestJS Microservices Documentation](https://docs.nestjs.com/microservices/basics)
- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/reliability.html)
- [RabbitMQ Heartbeats](https://www.rabbitmq.com/heartbeats.html)
- [Docker Health Checks](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [Kubernetes Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
