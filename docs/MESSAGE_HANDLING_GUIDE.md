# Developer Guide: Adding New RPC Methods and Events

This guide provides step-by-step instructions for developers on how to add new RPC methods and events to the microservices architecture following best practices.

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Adding a New RPC Method](#adding-a-new-rpc-method)
3. [Adding a New Event](#adding-a-new-event)
4. [Testing Your Changes](#testing-your-changes)
5. [Common Patterns](#common-patterns)
6. [Troubleshooting](#troubleshooting)

## Quick Reference

### Command Summary
```bash
# Build a specific service
npm run build:user
npm run build:notification
npm run build:auth

# Run tests
npm test

# Format code
npm run format
```

### File Locations
- Message constants: `libs/shared/constants/message.constants.ts`
- RPC controllers: `apps/{service}/src/{service}-rpc.controller.ts`
- Event handlers: `apps/{service}/src/{service}-event.handler.ts`
- Service module: `apps/{service}/src/{service}.module.ts`

## Adding a New RPC Method

RPC (Remote Procedure Call) methods are used for synchronous request-response communication between services.

### Step 1: Define the Constant

Add your RPC method constant to `libs/shared/constants/message.constants.ts`:

```typescript
export const RPC_METHODS = {
  // ... existing methods
  USER: {
    // ... existing user methods
    YOUR_NEW_METHOD: 'yourNewMethod',
  },
};
```

**Naming Convention:**
- Use camelCase
- Start with an action verb (get, create, update, delete, find)
- Be descriptive: `getUserById`, `createUserProfile`, `updateUserSettings`

### Step 2: Create or Update the RPC Controller

If your service doesn't have an RPC controller yet, create one at `apps/{service}/src/{service}-rpc.controller.ts`:

```typescript
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RPC_METHODS } from '@shared/constants/message.constants';

@Controller()
export class UserRpcController {
  private readonly logger = new Logger(UserRpcController.name);

  constructor(
    private readonly userService: UserService,
    // ... other dependencies
  ) {}

  @MessagePattern(RPC_METHODS.USER.YOUR_NEW_METHOD)
  async yourNewMethod(@Payload() params: YourParamsType) {
    this.logger.log(`RPC: ${RPC_METHODS.USER.YOUR_NEW_METHOD}`);
    
    try {
      // 1. Validate params
      if (!params.requiredField) {
        throw new Error('Required field is missing');
      }

      // 2. Call service method
      const result = await this.userService.yourBusinessLogic(params);

      // 3. Return result
      return result;
    } catch (error) {
      this.logger.error(
        `Error in ${RPC_METHODS.USER.YOUR_NEW_METHOD}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
```

**Best Practices:**
- Keep controller methods thin
- Validate input at controller level
- Delegate business logic to service layer
- Add proper error handling and logging
- Use TypeScript types for parameters

### Step 3: Register the Controller

Add the RPC controller to your service module:

```typescript
@Module({
  controllers: [
    UserController,
    UserRpcController,  // Add this
    // ... other controllers
  ],
  providers: [UserService, UserRepository],
})
export class UserModule {}
```

### Step 4: Call the RPC Method from Another Service

From another service, send an RPC request:

```typescript
import { RPC_METHODS } from '@shared/constants/message.constants';
import { RABBITMQ_ROUTING_KEYS } from '@shared/config/rabbitmq.config';

// In your service
const result = await this.rabbitMQClient.sendRPCRequest(
  RABBITMQ_ROUTING_KEYS.RPC_USER,
  RPC_METHODS.USER.YOUR_NEW_METHOD,
  { requiredField: 'value' },
);
```

## Adding a New Event

Events are used for asynchronous, fire-and-forget communication between services.

### Step 1: Define the Event Constant

Add your event constant to `libs/shared/constants/message.constants.ts`:

```typescript
export const EVENT_NAMES = {
  // ... existing events
  USER: {
    // ... existing user events
    YOUR_NEW_EVENT: 'user.yourNewEvent',
  },
};
```

**Naming Convention:**
- Use dot notation: `service.resource.action`
- Use lowercase with dots as separators
- Use past tense: `user.created`, `order.shipped`, `payment.processed`

### Step 2: Publish the Event

In the service that generates the event:

```typescript
import { EVENT_NAMES } from '@shared/constants/message.constants';
import { RABBITMQ_EXCHANGES, RABBITMQ_ROUTING_KEYS } from '@shared/config/rabbitmq.config';

// In your service method
await this.rabbitMQClient.publishEvent(
  RABBITMQ_EXCHANGES.EVENTS,
  RABBITMQ_ROUTING_KEYS.USER_YOUR_EVENT,  // Add to rabbitmq.config.ts if needed
  EVENT_NAMES.USER.YOUR_NEW_EVENT,
  {
    // Event payload
    userId: user.id,
    timestamp: new Date(),
    // ... other data
  },
);
```

### Step 3: Create or Update the Event Handler

If your service needs to handle this event, create/update the event handler at `apps/{service}/src/{service}-event.handler.ts`:

```typescript
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EVENT_NAMES } from '@shared/constants/message.constants';

@Controller()
export class NotificationEventHandler {
  private readonly logger = new Logger(NotificationEventHandler.name);

  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  @EventPattern(EVENT_NAMES.USER.YOUR_NEW_EVENT)
  async handleYourNewEvent(@Payload() data: YourEventDataType) {
    this.logger.log(
      `Event: ${EVENT_NAMES.USER.YOUR_NEW_EVENT} - ${JSON.stringify(data)}`,
    );

    try {
      // Process the event
      await this.notificationService.handleUserEvent(data);
    } catch (error) {
      this.logger.error(
        `Error handling ${EVENT_NAMES.USER.YOUR_NEW_EVENT}: ${error.message}`,
      );
      // Events should not throw - log and continue
    }
  }
}
```

**Best Practices:**
- Event handlers should not throw errors (they're fire-and-forget)
- Log errors instead of throwing
- Keep event handlers idempotent (safe to run multiple times)
- Don't put heavy processing in event handlers - queue it if needed

### Step 4: Register the Event Handler

Add the event handler to your service module:

```typescript
@Module({
  controllers: [
    NotificationController,
    NotificationEventHandler,  // Add this
    // ... other controllers
  ],
  providers: [NotificationService],
})
export class NotificationModule {}
```

### Step 5: Configure Event Routing

Ensure your service is bound to the correct routing key in the module's `onModuleInit`:

```typescript
async onModuleInit() {
  // ... existing setup

  // Bind to the new event
  await this.rabbitMQClient.bindQueue({
    queue: RABBITMQ_QUEUES.NOTIFICATION_EVENTS,
    exchange: RABBITMQ_EXCHANGES.EVENTS,
    routingKey: 'user.yourNewEvent',  // Or use pattern: 'user.*'
  });

  // ... rest of setup
}
```

## Testing Your Changes

### Unit Testing RPC Controllers

Create a test file at `apps/{service}/test/{service}-rpc.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserRpcController } from '../src/user-rpc.controller';
import { RPC_METHODS } from '@shared/constants/message.constants';

describe('UserRpcController', () => {
  let controller: UserRpcController;
  let mockUserService: any;

  beforeEach(async () => {
    mockUserService = {
      yourBusinessLogic: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRpcController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserRpcController>(UserRpcController);
  });

  describe('yourNewMethod', () => {
    it('should call service with correct params', async () => {
      const params = { requiredField: 'value' };
      const expectedResult = { success: true };
      
      mockUserService.yourBusinessLogic.mockResolvedValue(expectedResult);

      const result = await controller.yourNewMethod(params);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.yourBusinessLogic).toHaveBeenCalledWith(params);
    });

    it('should throw error when validation fails', async () => {
      const params = {}; // Missing required field

      await expect(controller.yourNewMethod(params)).rejects.toThrow(
        'Required field is missing',
      );
    });
  });
});
```

### Unit Testing Event Handlers

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationEventHandler } from '../src/notification-event.handler';
import { EVENT_NAMES } from '@shared/constants/message.constants';

describe('NotificationEventHandler', () => {
  let handler: NotificationEventHandler;
  let mockNotificationService: any;

  beforeEach(async () => {
    mockNotificationService = {
      handleUserEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationEventHandler],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    handler = module.get<NotificationEventHandler>(NotificationEventHandler);
  });

  describe('handleYourNewEvent', () => {
    it('should process event data', async () => {
      const eventData = { userId: '123', timestamp: new Date() };

      await handler.handleYourNewEvent(eventData);

      expect(mockNotificationService.handleUserEvent).toHaveBeenCalledWith(
        eventData,
      );
    });

    it('should not throw when processing fails', async () => {
      const eventData = { userId: '123' };
      mockNotificationService.handleUserEvent.mockRejectedValue(
        new Error('Processing failed'),
      );

      // Should not throw
      await expect(
        handler.handleYourNewEvent(eventData),
      ).resolves.not.toThrow();
    });
  });
});
```

### Integration Testing

```typescript
describe('Message Routing Integration', () => {
  it('should route RPC request correctly', async () => {
    const result = await rabbitMQClient.sendRPCRequest(
      RABBITMQ_ROUTING_KEYS.RPC_USER,
      RPC_METHODS.USER.YOUR_NEW_METHOD,
      { requiredField: 'value' },
    );

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should deliver event to handler', async () => {
    // Publish event
    await rabbitMQClient.publishEvent(
      RABBITMQ_EXCHANGES.EVENTS,
      RABBITMQ_ROUTING_KEYS.USER_YOUR_EVENT,
      EVENT_NAMES.USER.YOUR_NEW_EVENT,
      { userId: '123' },
    );

    // Wait for event processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify event was processed (check logs or database)
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- user-rpc.controller.spec.ts

# Run with coverage
npm run test:cov
```

## Common Patterns

### Pattern 1: RPC with Multiple Parameters

```typescript
@MessagePattern(RPC_METHODS.USER.UPDATE_USER_PROFILE)
async updateUserProfile(
  @Payload() params: {
    userId: string;
    profile: {
      name?: string;
      bio?: string;
      avatar?: string;
    };
  },
) {
  return await this.userService.updateProfile(params.userId, params.profile);
}
```

### Pattern 2: Event with Rich Payload

```typescript
await this.rabbitMQClient.publishEvent(
  RABBITMQ_EXCHANGES.EVENTS,
  RABBITMQ_ROUTING_KEYS.ORDER_COMPLETED,
  EVENT_NAMES.ORDER.COMPLETED,
  {
    orderId: order.id,
    userId: order.userId,
    items: order.items,
    total: order.total,
    completedAt: new Date(),
    metadata: {
      source: 'web',
      version: '1.0',
    },
  },
);
```

### Pattern 3: Chaining Events

```typescript
// Service A publishes event
await this.rabbitMQClient.publishEvent(
  RABBITMQ_EXCHANGES.EVENTS,
  RABBITMQ_ROUTING_KEYS.USER_CREATED,
  EVENT_NAMES.USER.CREATED,
  userData,
);

// Service B handles event and publishes another
@EventPattern(EVENT_NAMES.USER.CREATED)
async handleUserCreated(@Payload() data: any) {
  await this.sendWelcomeEmail(data);
  
  // Publish follow-up event
  await this.rabbitMQClient.publishEvent(
    RABBITMQ_EXCHANGES.EVENTS,
    RABBITMQ_ROUTING_KEYS.WELCOME_EMAIL_SENT,
    EVENT_NAMES.NOTIFICATION.WELCOME_EMAIL_SENT,
    { userId: data.userId },
  );
}
```

## Troubleshooting

### Issue: RPC request times out

**Solution:**
1. Check that the RPC controller is registered in the module
2. Verify the routing key matches
3. Ensure the queue is bound to the correct exchange
4. Check for errors in the handler

### Issue: Event not being received

**Solution:**
1. Verify queue binding has correct routing key pattern
2. Check that event handler is registered
3. Ensure the exchange type is correct (topic for patterns)
4. Look for errors in RabbitMQ management UI

### Issue: TypeScript errors after adding constants

**Solution:**
1. Rebuild the project: `npm run build`
2. Restart TypeScript server in your IDE
3. Check import paths are correct

### Issue: Tests failing after migration

**Solution:**
1. Update test mocks to use constants
2. Ensure test module has all required providers
3. Check that RPC message format includes required fields

## Checklist for Adding New Functionality

- [ ] Add constant to `message.constants.ts`
- [ ] Create or update RPC controller / event handler
- [ ] Register controller in module
- [ ] Update routing/bindings if needed
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test manually with running services
- [ ] Update this documentation if needed
- [ ] Build successfully: `npm run build:{service}`
- [ ] All tests pass: `npm test`

## Additional Resources

- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [RabbitMQ Tutorial](https://www.rabbitmq.com/getstarted.html)
- [Shared Library README](../libs/shared/README.md)
- [Main README](../README.md)
