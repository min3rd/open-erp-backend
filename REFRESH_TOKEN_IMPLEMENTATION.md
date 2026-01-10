# Refresh Token Implementation Summary

## Overview
This implementation adds a secure token refresh endpoint to the `open-erp-backend` authentication service, allowing clients to obtain new access tokens without re-authenticating.

## Endpoint
**POST /auth/refresh**

### Request
```json
{
  "refreshToken": "a1b2c3d4e5f6...64-character-hex-string"
}
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "error": null,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "b2c3d4e5f6g7...new-64-character-hex-string",
    "user": {
      "email": "user@example.com",
      "fullName": "John Doe",
      "avatarUrl": null
    }
  }
}
```

### Error Responses
- **401 Unauthorized**: Invalid, expired, revoked, or reused token
- **429 Too Many Requests**: Rate limit exceeded (10 requests/minute)

## Client Integration Example

### JavaScript/TypeScript
```typescript
async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await fetch('http://localhost:3001/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });

    const result = await response.json();

    if (result.success) {
      // Store new tokens
      localStorage.setItem('accessToken', result.data.accessToken);
      localStorage.setItem('refreshToken', result.data.refreshToken);
      return result.data;
    } else {
      // Token refresh failed, redirect to login
      window.location.href = '/login';
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
}

// Use with axios interceptor
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { accessToken } = await refreshAccessToken(refreshToken);
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          return axios(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);
```

## Security Features

### 1. HMAC-Based Token Hashing
- Refresh tokens are stored as HMAC-SHA256 hashes, not plain text
- Uses JWT_SECRET as the HMAC key for additional security
- Even with database access, tokens cannot be reverse-engineered

### 2. Automatic Token Rotation
- Each refresh operation generates a new refresh token
- Old token is marked as rotated and cannot be reused
- Prevents replay attacks and limits the window of vulnerability

### 3. Token Reuse Detection
- If a rotated token is reused, system detects potential compromise
- All refresh tokens for the user are automatically revoked
- Forces re-authentication to establish new secure session
- Security event is logged for audit

### 4. Rate Limiting
- 10 requests per minute per IP address
- Prevents brute force token attacks
- Can be bypassed for SYSTEM_ADMIN users (for administrative tools)

### 5. Comprehensive Validation
- Token existence check
- Expiration validation
- Revocation status check
- Rotation status check
- User account status validation (must be active)

### 6. Audit Logging
All refresh operations are logged with structured data:
- `refresh.token.success`: Successful token refresh
- `refresh.token.expired`: Expired token attempt
- `refresh.token.revoked`: Revoked token attempt
- `refresh.token.reuse.detected`: Token reuse detected (security event)
- `refresh.token.user.not.found`: User not found
- `refresh.token.user.inactive`: Inactive user attempt

## Database Schema

### RefreshToken Collection
```typescript
{
  _id: ObjectId,
  userId: ObjectId,              // Reference to user
  tokenHash: string,              // HMAC-SHA256 hash of token
  token?: string,                 // Legacy field (optional, for migration)
  expiresAt: Date,               // Token expiration
  deviceInfo?: string,            // Client device info
  ipAddress?: string,             // Client IP
  revoked: boolean,              // Revocation status
  revokedAt?: Date,              // Revocation timestamp
  revokedReason?: string,        // Reason (e.g., 'rotated', 'manual', 'compromised')
  isRotated: boolean,            // Whether token has been rotated
  replacedByTokenId?: ObjectId,  // Reference to replacement token
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ userId: 1, revoked: 1 }` - User token queries
- `{ userId: 1, isRotated: 1 }` - Active token queries
- `{ tokenHash: 1 }` - Token lookup (unique)
- `{ expiresAt: 1 }` - TTL index for automatic cleanup

## Configuration

### Environment Variables (.env)
```bash
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m          # Access token lifetime
JWT_REFRESH_EXPIRES_IN=7d          # Refresh token lifetime
```

### Recommended Settings
- **Development**: `JWT_REFRESH_EXPIRES_IN=7d`
- **Production**: `JWT_REFRESH_EXPIRES_IN=7d` to `JWT_REFRESH_EXPIRES_IN=30d`
- **High Security**: `JWT_REFRESH_EXPIRES_IN=1d` with more frequent rotation

## Migration Guide

### For Existing Systems with Plain Text Tokens

1. **Deploy New Code** (with backward compatibility)
   - The `token` field is now optional (sparse index)
   - New tokens are stored in `tokenHash` field
   - Login still works and creates new hashed tokens

2. **Migrate Existing Tokens** (optional)
   ```javascript
   // Migration script (run once)
   db.refresh_tokens.find({ tokenHash: { $exists: false } }).forEach(doc => {
     // Cannot hash existing plain text tokens as original values are lost
     // Option 1: Mark as expired (force re-login)
     db.refresh_tokens.updateOne(
       { _id: doc._id },
       { 
         $set: { 
           expiresAt: new Date(),
           revoked: true,
           revokedReason: 'migration'
         } 
       }
     );
   });
   ```

3. **Remove Legacy Field** (after migration period)
   - Wait for all old tokens to expire (7-30 days)
   - Remove the `token` field from schema
   - Update indexes

### For New Systems
- No migration needed
- All tokens use hashed storage from the start

## Testing

### Unit Tests (31 tests)
- Token generation and hashing
- HMAC security validation
- Token utility functions

### Integration Tests (8 tests)
- Successful token refresh
- Invalid token handling
- Expired token handling
- Revoked token handling
- Token reuse detection
- User validation
- Token rotation verification

All tests pass successfully.

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| AUTH_0015 | 401 | Invalid refresh token or token not found |
| AUTH_0016 | 401 | Refresh token has expired |
| AUTH_0017 | 401 | Refresh token has been revoked |
| AUTH_0018 | 401 | Token reuse detected (all sessions terminated) |

## Best Practices

### Client-Side
1. Store tokens securely (HTTP-only cookies recommended)
2. Implement automatic refresh before access token expires
3. Handle refresh failures gracefully (redirect to login)
4. Clear tokens on logout

### Server-Side
1. Use strong JWT_SECRET (32+ random characters)
2. Set appropriate token lifetimes for your security requirements
3. Monitor audit logs for suspicious refresh patterns
4. Implement additional security for administrative accounts
5. Use HTTPS in production

### Monitoring
1. Track `refresh.token.reuse.detected` events (indicates potential compromise)
2. Monitor high failure rates (indicates attack or misconfiguration)
3. Alert on mass revocations
4. Review audit logs regularly

## Performance Considerations

- Token lookup uses indexed hash field (O(1) lookup)
- Rotation creates single new document (minimal write overhead)
- TTL index automatically cleans up expired tokens
- Rate limiting prevents resource exhaustion

## Future Enhancements

Possible improvements for future versions:
1. Device fingerprinting for additional validation
2. IP address change detection
3. Refresh token families for better compromise detection
4. Admin dashboard for token management
5. Token revocation API endpoint
6. Configurable token rotation policies per user/role
7. OAuth2-compliant token introspection endpoint
