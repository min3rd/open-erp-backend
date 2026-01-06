# Shared Library

This directory contains shared libraries, types, configurations, and utilities used across all microservices in the Open ERP Backend project.

## Structure

```
libs/shared/
├── authz/              # Authorization utilities and guards
├── config/             # Configuration utilities
├── constants/          # Shared constants for RPC and events
├── database/           # Database utilities and configurations
├── errors/             # Error definitions and error factory
├── rabbitmq/           # RabbitMQ client and module
├── schemas/            # Shared MongoDB schemas
├── services/           # Shared service implementations
└── types/              # Shared TypeScript type definitions
```

## Message Constants

The `constants/message.constants.ts` file provides a centralized location for all RPC method names and event names used in microservice communication.

### Why Use Constants?

Using constants instead of hardcoded strings provides:
- **Type safety**: TypeScript autocompletion and compile-time checks
- **Single source of truth**: One place to manage all message names
- **Easy refactoring**: Change a name once, reflected everywhere
- **Prevention of typos**: No more silent failures from misspelled message names
- **Better documentation**: Clear overview of all available RPC methods and events

### Usage

#### Importing Constants

```typescript
import { RPC_METHODS, EVENT_NAMES } from '@shared/constants/message.constants';
```

#### Using RPC Methods in Controllers

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RPC_METHODS } from '@shared/constants/message.constants';

@Controller()
export class UserRpcController {
  @MessagePattern(RPC_METHODS.USER.GET_USER)
  async getUser(@Payload() params: { userId: string }) {
    // Handle RPC request
    return await this.userRepository.findById(params.userId);
  }
}
```

#### Using Event Names in Handlers

```typescript
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EVENT_NAMES } from '@shared/constants/message.constants';

@Controller()
export class UserEventHandler {
  @EventPattern(EVENT_NAMES.AUTH.USER_REGISTERED)
  async handleUserRegistered(@Payload() data: { username: string; email: string }) {
    // Handle event
    await this.userRepository.create(data);
  }
}
```

#### Publishing Events

```typescript
import { EVENT_NAMES } from '@shared/constants/message.constants';

// Publish an event
await this.rabbitMQClient.publishEvent(
  RABBITMQ_EXCHANGES.EVENTS,
  RABBITMQ_ROUTING_KEYS.USER_CREATED,
  EVENT_NAMES.USER.CREATED,
  userData,
);
```

#### Sending RPC Requests

```typescript
import { RPC_METHODS } from '@shared/constants/message.constants';

// Send RPC request
const user = await this.rabbitMQClient.sendRPCRequest(
  RABBITMQ_ROUTING_KEYS.RPC_USER,
  RPC_METHODS.USER.GET_USER,
  { userId: '123' },
);
```

### Available Constants

#### RPC Methods

**User Service:**
- `RPC_METHODS.USER.GET_USER` - Get user by ID
- `RPC_METHODS.USER.GET_USER_BY_EMAIL` - Get user by email
- `RPC_METHODS.USER.FIND_USER_BY_EMAIL` - Find user by email (alias)
- `RPC_METHODS.USER.FIND_USER_BY_ID` - Find user by ID
- `RPC_METHODS.USER.CREATE_USER` - Create a new user
- `RPC_METHODS.USER.UPDATE_USER_STATUS` - Update user status
- `RPC_METHODS.USER.UPDATE_LAST_LOGIN` - Update last login timestamp
- `RPC_METHODS.USER.UPDATE_USER_PASSWORD` - Update user password

**Notification Service:**
- `RPC_METHODS.NOTIFICATION.SEND_NOTIFICATION` - Send a notification
- `RPC_METHODS.NOTIFICATION.SEND_VERIFICATION_EMAIL` - Send verification email
- `RPC_METHODS.NOTIFICATION.SEND_PASSWORD_RESET_EMAIL` - Send password reset email
- `RPC_METHODS.NOTIFICATION.SEND_PASSWORD_CHANGED_EMAIL` - Send password changed email

#### Event Names

**User Events:**
- `EVENT_NAMES.USER.CREATED` - User created
- `EVENT_NAMES.USER.UPDATED` - User updated
- `EVENT_NAMES.USER.DELETED` - User deleted
- `EVENT_NAMES.USER.REGISTERED` - User registered
- `EVENT_NAMES.USER.LOGIN` - User logged in
- `EVENT_NAMES.USER.PROFILE_UPDATED` - User profile updated

**Auth Events:**
- `EVENT_NAMES.AUTH.USER_REGISTERED` - User registered via auth service
- `EVENT_NAMES.AUTH.USER_LOGIN` - User logged in via auth service
- `EVENT_NAMES.AUTH.USER_LOGOUT` - User logged out
- `EVENT_NAMES.AUTH.PASSWORD_CHANGED` - Password changed
- `EVENT_NAMES.AUTH.USER_PASSWORD_CHANGED` - User password changed
- `EVENT_NAMES.AUTH.USER_VERIFIED` - User verified

**Notification Events:**
- `EVENT_NAMES.NOTIFICATION.EMAIL_SENT` - Email sent
- `EVENT_NAMES.NOTIFICATION.SMS_SENT` - SMS sent
- `EVENT_NAMES.NOTIFICATION.PUSH_SENT` - Push notification sent

**Tenant Events:**
- `EVENT_NAMES.TENANT.ORG_CREATED` - Organization created
- `EVENT_NAMES.TENANT.ORG_UPDATED` - Organization updated
- `EVENT_NAMES.TENANT.ORG_DELETED` - Organization deleted
- `EVENT_NAMES.TENANT.MEMBER_INVITED` - Member invited
- `EVENT_NAMES.TENANT.MEMBER_JOINED` - Member joined
- `EVENT_NAMES.TENANT.MEMBER_REMOVED` - Member removed
- And more...

## Adding New RPC Methods or Events

When adding new microservice functionality, follow these steps:

### 1. Add Constants

Edit `libs/shared/constants/message.constants.ts`:

```typescript
export const RPC_METHODS = {
  // ... existing methods
  YOUR_SERVICE: {
    YOUR_NEW_METHOD: 'yourNewMethod',
  },
};

export const EVENT_NAMES = {
  // ... existing events
  YOUR_SERVICE: {
    YOUR_NEW_EVENT: 'yourService.newEvent',
  },
};
```

### 2. Create RPC Controller with @MessagePattern

Create a dedicated RPC controller for your service:

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RPC_METHODS } from '@shared/constants/message.constants';

@Controller()
export class YourServiceRpcController {
  constructor(private readonly yourService: YourService) {}

  @MessagePattern(RPC_METHODS.YOUR_SERVICE.YOUR_NEW_METHOD)
  async handleYourNewMethod(@Payload() params: YourParamsType) {
    // Validation and authorization here
    return await this.yourService.yourBusinessLogic(params);
  }
}
```

### 3. Create Event Handler with @EventPattern

Create a dedicated event handler:

```typescript
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EVENT_NAMES } from '@shared/constants/message.constants';

@Controller()
export class YourServiceEventHandler {
  constructor(private readonly yourService: YourService) {}

  @EventPattern(EVENT_NAMES.YOUR_SERVICE.YOUR_NEW_EVENT)
  async handleYourNewEvent(@Payload() data: YourEventDataType) {
    // Handle the event
    await this.yourService.processEvent(data);
  }
}
```

### 4. Register Controllers in Module

Add the controllers to your module:

```typescript
@Module({
  controllers: [
    YourServiceController,
    YourServiceRpcController,  // Add this
    YourServiceEventHandler,   // Add this
  ],
  providers: [YourService, YourRepository],
})
export class YourServiceModule {}
```

### 5. Write Tests

Create unit tests for your controllers:

```typescript
describe('YourServiceRpcController', () => {
  let controller: YourServiceRpcController;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [YourServiceRpcController],
      providers: [/* mock providers */],
    }).compile();
    
    controller = module.get<YourServiceRpcController>(YourServiceRpcController);
  });
  
  it('should handle RPC request', async () => {
    const result = await controller.handleYourNewMethod({ /* params */ });
    expect(result).toBeDefined();
  });
});
```

### 6. Integration Testing

Test that messages are routed correctly:

```typescript
describe('Message Routing Integration', () => {
  it('should route RPC requests to correct handler', async () => {
    const result = await rabbitMQClient.sendRPCRequest(
      RABBITMQ_ROUTING_KEYS.RPC_YOUR_SERVICE,
      RPC_METHODS.YOUR_SERVICE.YOUR_NEW_METHOD,
      { /* params */ },
    );
    expect(result).toBeDefined();
  });
});
```

## Best Practices

### DO:
✅ Always use constants for RPC method names and event names  
✅ Use `@MessagePattern` for RPC handlers  
✅ Use `@EventPattern` for event handlers  
✅ Keep controllers thin - delegate to services  
✅ Add validation at the controller level  
✅ Write unit tests for each handler  
✅ Use TypeScript types for payloads  

### DON'T:
❌ Use hardcoded strings for message names  
❌ Use large switch-case statements in handleRPC/handleEvent  
❌ Put business logic in controllers  
❌ Skip error handling  
❌ Forget to register controllers in the module  

## Migration from Legacy Code

If you have existing code using switch-case `handleRPC`/`handleEvent` methods:

1. **Add constants** for existing message names
2. **Create new controller** with `@MessagePattern` handlers
3. **Update service** to use constants instead of strings
4. **Register controller** in module
5. **Write tests** for the new controller
6. **Verify** that all messages are still handled correctly
7. **Remove** old switch-case methods

## Type Safety

Use the provided type helpers for additional type safety:

```typescript
import type { UserRpcMethod, UserEvent } from '@shared/constants/message.constants';

function handleUserRpc(method: UserRpcMethod) {
  // TypeScript will only allow valid user RPC methods
}

function handleUserEvent(event: UserEvent) {
  // TypeScript will only allow valid user events
}
```

## Naming Conventions

### RPC Methods
- Use camelCase: `getUserById`, `createUser`, `updateUserStatus`
- Start with action verb: `get`, `create`, `update`, `delete`, `find`
- Be specific and descriptive

### Event Names
- Use dot notation: `user.created`, `auth.user.login`
- Format: `<service>.<resource>.<action>`
- Use lowercase with dots as separators
- Use past tense for actions: `created`, `updated`, `deleted`

## References

- [NestJS Microservices Documentation](https://docs.nestjs.com/microservices/basics)
- [RabbitMQ Patterns](https://www.rabbitmq.com/getstarted.html)
- [Message Pattern Decorator](https://docs.nestjs.com/microservices/basics#request-response)
- [Event Pattern Decorator](https://docs.nestjs.com/microservices/basics#event-based)
