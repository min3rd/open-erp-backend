# Email Verification API Documentation

This document describes the email verification and resend verification endpoints in the Auth service.

## Overview

The email verification system provides two main endpoints:
1. **Verify Email**: Verify a user's email address using a verification code
2. **Resend Verification**: Request a new verification code to be sent

## Endpoints

### 1. POST `/auth/verify-email`

Verify a user's email address with the verification code sent during registration.

#### Request

**Method**: `POST`  
**URL**: `/auth/verify-email`  
**Content-Type**: `application/json`

**Body Parameters**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

| Parameter | Type   | Required | Description                           |
|-----------|--------|----------|---------------------------------------|
| email     | string | Yes      | User's email address                  |
| code      | string | Yes      | 6-digit verification code from email  |

#### Response

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}
```

**Error Responses**:

- **400 Bad Request** - Invalid or expired verification code
```json
{
  "success": false,
  "errorCode": "AUTH_0008",
  "message": "The verification code you entered is invalid. Please check and try again.",
  "details": {
    "email": "user@example.com"
  }
}
```

- **400 Bad Request** - Verification code expired
```json
{
  "success": false,
  "errorCode": "AUTH_0007",
  "message": "Your verification code has expired. Please request a new one.",
  "details": {
    "email": "user@example.com"
  }
}
```

- **404 Not Found** - User not found
```json
{
  "success": false,
  "errorCode": "USER_0001",
  "message": "User not found."
}
```

- **409 Conflict** - User already verified
```json
{
  "success": false,
  "errorCode": "AUTH_0009",
  "message": "Your email is already verified."
}
```

#### Behavior

1. **Validation**: Checks if the user exists and the code is valid and not expired
2. **Single-use**: Verification code can only be used once (marked as used after successful verification)
3. **User Status Update**: Updates user status from `pending` to `active` and sets `verifiedAt` timestamp
4. **Event Emission**: Publishes `user.verified` event to RabbitMQ for other services
5. **Logging**: Logs verification success/failure with structured data

#### Example

```bash
curl -X POST http://localhost:3001/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456"
  }'
```

---

### 2. POST `/auth/resend-verification`

Request a new verification code to be sent to the user's email.

#### Request

**Method**: `POST`  
**URL**: `/auth/resend-verification`  
**Content-Type**: `application/json`

**Body Parameters**:
```json
{
  "email": "user@example.com"
}
```

| Parameter | Type   | Required | Description          |
|-----------|--------|----------|----------------------|
| email     | string | Yes      | User's email address |

#### Response

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Verification code has been sent to your email.",
  "data": {
    "email": "user@example.com",
    "attemptsRemaining": 2
  }
}
```

**Error Responses**:

- **409 Conflict** - User already verified
```json
{
  "success": false,
  "errorCode": "AUTH_0009",
  "message": "Your email is already verified."
}
```

- **429 Too Many Requests** - Rate limit exceeded
```json
{
  "success": false,
  "errorCode": "AUTH_0006",
  "message": "Too many verification attempts. Please wait before requesting another code.",
  "details": {
    "maxAttempts": 3,
    "windowMinutes": 60,
    "remainingAttempts": 0
  }
}
```

#### Behavior

1. **Security**: Returns success even if user doesn't exist (to prevent user enumeration)
2. **Rate Limiting**: Enforces maximum attempts (default: 3 per hour)
3. **Code Generation**: Generates new 6-digit verification code
4. **Email Sending**: Sends email via notification service
5. **Graceful Failure**: Email sending failures are logged but don't throw errors
6. **Logging**: Logs resend attempts with remaining attempts count

#### Rate Limiting

The resend endpoint is rate-limited to prevent abuse:
- **Default limit**: 3 attempts per hour
- **Configurable via**: `VERIFICATION_MAX_ATTEMPTS` and `VERIFICATION_RATE_LIMIT_WINDOW` env variables
- **Counter reset**: After the rate limit window expires

#### Example

```bash
curl -X POST http://localhost:3001/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

---

## Configuration

### Environment Variables

| Variable                          | Default | Description                                    |
|-----------------------------------|---------|------------------------------------------------|
| VERIFICATION_TOKEN_TTL            | 15      | Verification code expiration time (minutes)    |
| VERIFICATION_MAX_ATTEMPTS         | 3       | Maximum resend attempts per time window        |
| VERIFICATION_RATE_LIMIT_WINDOW    | 3600000 | Rate limit window (milliseconds, default: 1h)  |

### Example `.env` Configuration

```bash
# Verification settings
VERIFICATION_TOKEN_TTL=15
VERIFICATION_MAX_ATTEMPTS=3
VERIFICATION_RATE_LIMIT_WINDOW=3600000
```

---

## Verification Flow

### Registration to Verification Flow

```
1. User registers                  → POST /auth/register
   ├─ User created (status: pending)
   ├─ Verification code generated
   └─ Email sent with code

2. User receives email             → Contains 6-digit code
   └─ Valid for 15 minutes (default)

3. User submits verification       → POST /auth/verify-email
   ├─ Code validated
   ├─ User status → active
   ├─ Code marked as used
   └─ user.verified event emitted

4. User can now login              → POST /auth/login
```

### Resend Verification Flow

```
1. User didn't receive email       → POST /auth/resend-verification
   ├─ Rate limit checked
   ├─ New code generated
   └─ Email sent

2. Previous codes invalidated      → Only latest code is valid

3. User submits verification       → POST /auth/verify-email
```

---

## Security Considerations

### Single-Use Codes
- Verification codes can only be used once
- After successful verification, the code is marked as used
- Used codes cannot be reused

### Rate Limiting
- Resend endpoint is rate-limited per email
- Prevents abuse and spam
- Configurable limits and windows

### User Enumeration Protection
- Resend endpoint returns success even for non-existent users
- Prevents attackers from discovering registered emails

### Code Expiration
- Codes expire after configured TTL (default: 15 minutes)
- Expired codes are automatically cleaned up by MongoDB TTL index

### Secure Communication
- All API calls should use HTTPS in production
- Verification codes are transmitted via email (not in URLs)

---

## Events

### user.verified Event

Published to RabbitMQ when a user successfully verifies their email.

**Exchange**: `erp.events`  
**Routing Key**: `auth.user.verified`  
**Event Type**: `user.verified`

**Payload**:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Testing

### Unit Tests

Located in: `apps/auth/test/verify-email.service.spec.ts`

Tests cover:
- ✅ Successful email verification
- ✅ User not found scenarios
- ✅ Already verified users
- ✅ Invalid verification codes
- ✅ Expired verification codes
- ✅ Successful resend verification
- ✅ Rate limit enforcement
- ✅ Email sending failures
- ✅ Security considerations

Run tests:
```bash
npm test -- apps/auth/test/verify-email.service.spec.ts
```

### Manual Testing

1. **Register a user**:
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "Test User",
    "password": "Password123"
  }'
```

2. **Check email for verification code** (or check notification service logs)

3. **Verify email**:
```bash
curl -X POST http://localhost:3001/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

4. **Test resend** (if needed):
```bash
curl -X POST http://localhost:3001/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

---

## Troubleshooting

### Issue: "Verification code is invalid"

**Causes**:
- Wrong code entered
- Code expired (> 15 minutes old)
- Code already used
- User already verified

**Solutions**:
- Request new code via `/auth/resend-verification`
- Verify the code was copied correctly
- Check if user is already verified

### Issue: "Too many verification attempts"

**Cause**: Rate limit exceeded (default: 3 attempts per hour)

**Solution**: Wait for the rate limit window to expire (1 hour by default)

### Issue: "Email not received"

**Causes**:
- Email service configuration issues
- Email in spam folder
- Invalid email address

**Solutions**:
- Check notification service logs
- Verify SMTP configuration
- Use `/auth/resend-verification` to request new code
- Check spam/junk folder

---

## Related Documentation

- [Error Handling](./ERROR_HANDLING.md)
- [Microservices Architecture](./MICROSERVICES.md)
- [Testing Guide](./TESTING.md)
