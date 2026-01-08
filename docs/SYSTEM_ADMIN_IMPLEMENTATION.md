# SYSTEM_ADMIN Role Implementation

## Overview

The `SYSTEM_ADMIN` role provides full system access with the ability to bypass authorization and throttle guards. This role is automatically assigned to the first user who registers in a fresh system.

## Features

### 1. First-User Auto-Assignment

When the system has **zero users**, the first user who registers will automatically receive the `SYSTEM_ADMIN` role:

- During registration, the system checks the total user count
- If count is 0, the user is flagged as the first user
- After user creation, the `SYSTEM_ADMIN` role is automatically created (if it doesn't exist) and assigned
- This assignment is logged for audit purposes

### 2. Authorization Bypass

Users with `SYSTEM_ADMIN` role can bypass:

- **RolesGuard**: Automatically granted access regardless of required roles
- **PermissionsGuard**: Automatically granted access regardless of required permissions
- **ThrottlerGuard**: Rate limiting is bypassed, but requests are still logged for audit

All bypasses are logged with the following information:
- User ID and email
- Route accessed
- Timestamp
- Reason: "system_admin_bypass" or "SYSTEM_ADMIN throttle bypass"

### 3. JWT Token with Roles

When a user logs in, their JWT token includes:
- User ID (`sub`)
- Email
- **Roles array** (including `SYSTEM_ADMIN` if assigned)
- Organization ID (if applicable)

Example JWT payload:
```json
{
  "sub": "user-id-123",
  "email": "admin@example.com",
  "roles": ["SYSTEM_ADMIN"],
  "organizationId": "org-id-456",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### 4. Management APIs

The system provides REST APIs for managing SYSTEM_ADMIN users (all protected by SYSTEM_ADMIN role):

#### List SYSTEM_ADMIN Users
```
GET /admin/system-admins
Authorization: Bearer <jwt-token-with-system-admin-role>
```

Returns:
```json
{
  "success": true,
  "data": [
    {
      "userId": "user-id-123",
      "email": "admin@example.com",
      "fullName": "Admin User",
      "username": "admin",
      "status": "active",
      "grantedAt": "2024-01-01T00:00:00.000Z",
      "grantedBy": "system"
    }
  ],
  "count": 1
}
```

#### Grant SYSTEM_ADMIN Role
```
POST /admin/system-admins/grant/:userId
Authorization: Bearer <jwt-token-with-system-admin-role>
```

Returns:
```json
{
  "success": true,
  "message": "SYSTEM_ADMIN role granted successfully",
  "data": {
    "userId": "user-id-456",
    "email": "newadmin@example.com",
    "grantedBy": "admin@example.com"
  }
}
```

#### Revoke SYSTEM_ADMIN Role
```
DELETE /admin/system-admins/revoke/:userId
Authorization: Bearer <jwt-token-with-system-admin-role>
```

Safety checks:
- Cannot revoke your own SYSTEM_ADMIN role
- Cannot revoke the last SYSTEM_ADMIN (system must have at least one)

Returns:
```json
{
  "success": true,
  "message": "SYSTEM_ADMIN role revoked successfully",
  "data": {
    "userId": "user-id-456",
    "email": "user@example.com",
    "revokedBy": "admin@example.com"
  }
}
```

## Security Considerations

### Audit Logging

All SYSTEM_ADMIN activities are logged:

**Role Assignment:**
```json
{
  "event": "system_admin.assigned",
  "userId": "user-id-123",
  "email": "admin@example.com",
  "reason": "first_user_registration",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Role Grant:**
```json
{
  "event": "system_admin.granted",
  "targetUserId": "user-id-456",
  "targetEmail": "newadmin@example.com",
  "grantedBy": "user-id-123",
  "grantedByEmail": "admin@example.com",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Role Revocation:**
```json
{
  "event": "system_admin.revoked",
  "targetUserId": "user-id-456",
  "targetEmail": "user@example.com",
  "revokedBy": "user-id-123",
  "revokedByEmail": "admin@example.com",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Guard Bypass:**
```json
{
  "message": "SYSTEM_ADMIN bypass used",
  "userId": "user-id-123",
  "route": "POST /api/protected-endpoint",
  "correlationId": "correlation-id-789",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Throttle Bypass:**
```json
{
  "message": "SYSTEM_ADMIN throttle bypass",
  "userId": "user-id-123",
  "email": "admin@example.com",
  "route": "GET /api/endpoint",
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Best Practices

1. **Change First User Credentials**: After initial setup, ensure the first user changes their password and uses strong credentials

2. **Create Non-Admin Accounts**: Set up regular admin accounts (ORGANIZATION_ADMIN, etc.) for day-to-day operations

3. **Limit SYSTEM_ADMIN Usage**: Use SYSTEM_ADMIN only for:
   - Initial system setup
   - Emergency access
   - System-wide configuration changes
   - Cross-organization operations

4. **Monitor SYSTEM_ADMIN Activity**: Set up alerts for SYSTEM_ADMIN actions:
   - Role grants/revocations
   - Guard bypasses
   - Unusual access patterns

5. **Protect Registration During Installation**: Consider:
   - Disabling public registration after first user
   - Requiring invitation codes
   - Using environment variable for initial admin email

## Operational Guide

### Manual SYSTEM_ADMIN Assignment (via seed script)

Create a seed script to assign SYSTEM_ADMIN from environment variables:

```bash
# Set environment variable
export SYSTEM_ADMIN_EMAIL="admin@example.com"

# Run seed script (to be implemented)
npm run seed:system-admin
```

### Checking Current SYSTEM_ADMIN Users

```bash
# Using curl
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:3001/admin/system-admins
```

### Emergency SYSTEM_ADMIN Assignment (Database)

If you lose access to all SYSTEM_ADMIN accounts, manually update the database:

```javascript
// Connect to MongoDB
use open_erp;

// Find SYSTEM_ADMIN role
const role = db.roles.findOne({ code: 'SYSTEM_ADMIN', scope: 'global' });

// Add role to user
db.users.updateOne(
  { email: 'your-email@example.com' },
  {
    $addToSet: {
      roleAssignments: {
        roleId: role._id,
        grantedAt: new Date(),
        grantedBy: null
      }
    }
  }
);
```

## Implementation Details

### Files Modified/Created

1. **libs/shared/types/role.enum.ts** - Role enum with SYSTEM_ADMIN (already existed)
2. **libs/shared/authz/system-admin-throttler.guard.ts** - Custom throttler guard (new)
3. **apps/user/src/repositories/role.repository.ts** - Role management (new)
4. **apps/user/src/repositories/user.repository.ts** - Added role assignment methods
5. **apps/user/src/user-rpc.controller.ts** - Added role-related RPC methods
6. **apps/user/src/controllers/system-admin.controller.ts** - SYSTEM_ADMIN management API (new)
7. **apps/auth/src/auth.service.ts** - First-user detection and role assignment
8. **apps/auth/src/utils/token.util.ts** - JWT includes roles
9. **libs/shared/constants/message.constants.ts** - Added role-related RPC methods

### Database Schema

The `SYSTEM_ADMIN` role is stored in the `roles` collection:

```json
{
  "_id": ObjectId("..."),
  "name": "System Administrator",
  "code": "SYSTEM_ADMIN",
  "description": "Full system administrator with unrestricted access",
  "scope": "global",
  "organizationId": null,
  "permissions": [
    "system.admin",
    "system.config",
    "user.manage",
    "role.manage"
  ],
  "status": "active",
  "isSystem": true,
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

Role assignments are stored in the user's `roleAssignments` array:

```json
{
  "roleId": ObjectId("role-id"),
  "grantedAt": ISODate("2024-01-01T00:00:00.000Z"),
  "grantedBy": ObjectId("user-id") or "system"
}
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run specific tests
npm test -- first-user-system-admin.spec.ts
npm test -- system-admin-throttler.guard.spec.ts
```

## Troubleshooting

### Issue: First user didn't get SYSTEM_ADMIN role

**Solution:**
1. Check if user count was truly 0 when they registered
2. Check application logs for "First user registration detected" message
3. Verify role assignment logs
4. Manually assign SYSTEM_ADMIN role via API or database

### Issue: SYSTEM_ADMIN bypass not working

**Solution:**
1. Verify JWT token includes roles array
2. Check if role code is exactly "SYSTEM_ADMIN" (case-sensitive)
3. Verify guards are checking for SYSTEM_ADMIN role
4. Check application logs for bypass messages

### Issue: Cannot revoke last SYSTEM_ADMIN

**Solution:**
This is intentional for safety. To revoke:
1. First grant SYSTEM_ADMIN to another user
2. Then revoke from the original user
