# Authentication and Authorization Guide

This document describes how to use the authentication and authorization system in the Open ERP Backend.

## Overview

The system uses JWT-based authentication combined with role-based access control (RBAC) for authorization. All protected endpoints require:
1. Valid JWT token in the `Authorization` header
2. Appropriate permissions based on the user's assigned roles

## Table of Contents

- [Using @CurrentUser Decorator](#using-currentuser-decorator)
- [Available Roles and Permissions](#available-roles-and-permissions)
- [Protecting Endpoints](#protecting-endpoints)
- [Local Development & Testing](#local-development--testing)

## Using @CurrentUser Decorator

The `@CurrentUser()` decorator extracts the authenticated user from the request. This user information is set by the `JwtAuthGuard` after validating the JWT token.

### Example Usage

```typescript
import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { 
  JwtAuthGuard, 
  PermissionsGuard, 
  Permissions, 
  CurrentUser, 
  UserContext 
} from '@shared/authz';
import { Permission } from '@shared/types';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationController {
  @Post(':organizationId/users')
  @Permissions(Permission.ORGANIZATION_INVITE)
  async inviteMember(
    @Param('organizationId') organizationId: string,
    @Body() inviteDto: InviteMemberDto,
    @CurrentUser() currentUser: UserContext,
  ) {
    // currentUser.userId contains the authenticated user's ID
    const invitedById = currentUser.userId;
    
    // Use for audit trail
    return this.service.inviteMember(organizationId, inviteDto, invitedById);
  }
}
```

### UserContext Interface

```typescript
interface UserContext {
  userId: string;           // User's unique ID (required)
  email?: string;           // User's email address
  organizationId?: string;  // User's organization/tenant ID
  roles?: string[];         // User's assigned roles
}
```

## Available Roles and Permissions

### Roles (libs/shared/types/role.enum.ts)

```typescript
enum Role {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',           // Full system administrator
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN', // Organization administrator
  TENANT_ADMIN = 'TENANT_ADMIN',           // Legacy tenant administrator
  MANAGER = 'MANAGER',                     // Department/team manager
  USER = 'USER',                           // Standard user
  GUEST = 'GUEST',                         // Guest with limited access
}
```

### Permissions (libs/shared/types/permission.enum.ts)

#### User Management
- `USER_CREATE` - Create new users
- `USER_READ` - View user information
- `USER_UPDATE` - Update user details
- `USER_DELETE` - Delete users
- `USER_MANAGE` - Full user management

#### Organization Management
- `ORGANIZATION_CREATE` - Create organizations
- `ORGANIZATION_READ` - View organization details
- `ORGANIZATION_UPDATE` - Update organization settings
- `ORGANIZATION_DELETE` - Delete organizations
- `ORGANIZATION_MANAGE` - Full organization management
- `ORGANIZATION_INVITE` - Invite users to organization
- `ORGANIZATION_MEMBER_UPDATE` - Update member roles/status
- `ORGANIZATION_MEMBER_REMOVE` - Remove members from organization

#### Role Management
- `ROLE_CREATE` - Create new roles
- `ROLE_READ` - View roles
- `ROLE_UPDATE` - Update roles
- `ROLE_DELETE` - Delete roles
- `ROLE_ASSIGN` - Assign roles to users

#### System Administration
- `SYSTEM_ADMIN` - Full system access
- `SYSTEM_CONFIG` - System configuration
- `SYSTEM_LOGS` - View system logs

## Protecting Endpoints

### Step 1: Add Guards

Apply both `JwtAuthGuard` and `PermissionsGuard` to your controller or specific endpoints:

```typescript
@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationController {
  // All endpoints in this controller are now protected
}
```

### Step 2: Specify Required Permissions

Use the `@Permissions()` decorator to specify which permissions are required:

```typescript
// Single permission
@Post(':organizationId/users')
@Permissions(Permission.ORGANIZATION_INVITE)
async inviteMember() { ... }

// Multiple permissions (user must have ALL)
@Patch(':organizationId/settings')
@Permissions([Permission.ORGANIZATION_UPDATE, Permission.ORGANIZATION_MANAGE])
async updateSettings() { ... }

// Multiple permissions with OR logic (user must have ANY)
@Delete(':organizationId/users/:userId')
@Permissions(
  [Permission.ORGANIZATION_MEMBER_REMOVE, Permission.ORGANIZATION_MANAGE],
  { mode: 'any' }
)
async removeMember() { ... }
```

### Step 3: Use CurrentUser for Audit Trail

Always use `@CurrentUser()` to track who performed the action:

```typescript
async updateMembership(
  @Param('organizationId') organizationId: string,
  @Param('userId') userId: string,
  @Body() updateDto: UpdateMembershipDto,
  @CurrentUser() currentUser: UserContext,
) {
  const updatedById = currentUser.userId;
  return this.service.updateMembership(
    organizationId,
    userId,
    updateDto,
    updatedById, // Audit trail
  );
}
```

### Permission Scopes

Permissions can be checked at different scopes:

```typescript
// Organization scope (default) - checks within user's organization
@Permissions(Permission.USER_READ)
async getUsers() { ... }

// Global scope - checks across all organizations
@Permissions(Permission.SYSTEM_ADMIN, { scope: 'global' })
async getAllUsersAcrossOrganizations() { ... }
```

### Public Endpoints

To mark an endpoint as public (no authentication required):

```typescript
@Get('health')
@Public()
async healthCheck() {
  return { status: 'ok' };
}
```

## Local Development & Testing

### Setting Up JWT Secret

For local development, set the `JWT_SECRET` environment variable in your `.env` file:

```bash
# .env
JWT_SECRET=your-secret-key-here-should-be-at-least-32-characters-long
```

**Note:** If `JWT_SECRET` is not set in development, the system will auto-generate a random secret and log a warning. This is fine for local testing but should never be used in production.

### Creating Test JWT Tokens

For testing, you can create JWT tokens using Node.js:

```javascript
const jwt = require('jsonwebtoken');

// Create a test token
const token = jwt.sign(
  {
    sub: 'test-user-123',           // User ID
    email: 'test@example.com',      // User email
    organizationId: 'org-456',      // Organization ID
    roles: ['USER', 'MANAGER'],     // User roles
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('Token:', token);
```

### Using Test Tokens in API Requests

Include the token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/organizations/org-456/users
```

### Testing with Different Users

Create tokens with different permissions to test authorization:

```javascript
// Admin user with full permissions
const adminToken = jwt.sign(
  {
    sub: 'admin-123',
    email: 'admin@example.com',
    organizationId: 'org-456',
    roles: ['ORGANIZATION_ADMIN'],
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// Regular user with limited permissions
const userToken = jwt.sign(
  {
    sub: 'user-123',
    email: 'user@example.com',
    organizationId: 'org-456',
    roles: ['USER'],
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
```

### Integration Testing

In your tests, create JWT tokens and include them in requests:

```typescript
describe('OrganizationMembershipController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    // ... setup app
    
    // Create test token
    token = jwt.sign(
      { sub: 'test-user', email: 'test@example.com' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  it('/organizations/:id/users (POST) should require authentication', () => {
    return request(app.getHttpServer())
      .post('/organizations/org-123/users')
      .send({ identifier: 'user@example.com', role: 'MEMBER' })
      .expect(401); // No token provided
  });

  it('/organizations/:id/users (POST) should work with valid token', () => {
    return request(app.getHttpServer())
      .post('/organizations/org-123/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ identifier: 'user@example.com', role: 'MEMBER' })
      .expect(201);
  });
});
```

## Error Responses

### 401 Unauthorized
- Missing or invalid JWT token
- Expired token

```json
{
  "errorCode": "AUTH_UNAUTHORIZED",
  "message": "Invalid or expired token",
  "correlationId": "..."
}
```

### 403 Forbidden
- User lacks required permissions
- Cross-organization access denied

```json
{
  "errorCode": "AUTH_INSUFFICIENT_PERMISSIONS",
  "message": "Insufficient permissions. Required: organization.invite (all)",
  "correlationId": "...",
  "details": {
    "requiredPermissions": ["organization.invite"],
    "mode": "all",
    "scope": "organization"
  }
}
```

## Best Practices

1. **Always use @CurrentUser()** - Never hardcode user IDs like `'system'` or `'admin'`
2. **Apply guards at controller level** - Protect the entire controller unless specific endpoints need to be public
3. **Use specific permissions** - Prefer `ORGANIZATION_INVITE` over generic `ORGANIZATION_MANAGE` when possible
4. **Maintain audit trails** - Always pass `currentUser.userId` to service methods for audit logging
5. **Test with different roles** - Ensure your endpoints correctly enforce permissions for various user types
6. **Set JWT_SECRET in production** - Never rely on auto-generated secrets in production environments

## Migration Notes

If you're migrating from hardcoded user IDs:

```typescript
// Before (BAD)
const invitedById = 'system';
await this.service.inviteMember(org, dto, invitedById);

// After (GOOD)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(Permission.ORGANIZATION_INVITE)
async inviteMember(
  @CurrentUser() currentUser: UserContext,
  ...
) {
  const invitedById = currentUser.userId;
  await this.service.inviteMember(org, dto, invitedById);
}
```

## Further Reading

- [RBAC Authorization Documentation](./RBAC_AUTHORIZATION.md)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- [JWT.io - JSON Web Tokens](https://jwt.io/)
