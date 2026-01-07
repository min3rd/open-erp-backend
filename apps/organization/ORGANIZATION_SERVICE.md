# Organization Service - Organization & Corporate Hierarchy Management

## Overview

The Organization Service is a microservice that manages organizations and their corporate hierarchies, memberships, and invitations. It supports complex organizational structures including holdings, subsidiaries, joint ventures, partnerships, and branches.

## Features

### Organization Management
- **Create Organizations**: Register new organizations with full legal information (tax ID, address, legal representative, etc.)
- **Corporate Hierarchies**: Support for parent-child relationships between organizations
- **Organization Types**: Holding companies, subsidiaries, joint ventures, partners, and branches
- **Soft Delete**: Organizations can be soft-deleted and restored

### Relations
- **Parent-Child Links**: Link organizations in hierarchical structures
- **Relation Types**: owner-subsidiary, joint-venture, partner, branch, affiliated
- **Share Percentages**: Track ownership percentages
- **Effective Dates**: Track when relations became effective
- **Cycle Detection**: Prevents circular relationships (to be implemented)

### Membership Management
- **User Memberships**: Users can be members of multiple organizations
- **Roles**: Support for owner, admin, member, and finance roles
- **Primary Owner**: Each organization has one designated primary owner
- **Multi-tenancy**: Users maintain separate memberships across organizations

### Invitation System
- **Secure Tokens**: SHA-256 hashed invitation tokens with configurable expiry
- **Email/Username**: Invite by email or username
- **Role Assignment**: Specify roles during invitation
- **Scopes**: Invite to single organization or org + children
- **Lifecycle**: Pending → Accepted/Rejected/Expired/Revoked states
- **Single Use**: Tokens can only be used once

### Audit Logging
- **Comprehensive Tracking**: All organization, relation, member, and invitation changes are logged
- **Event Types**: 15+ different audit event types
- **Metadata**: IP address, user agent, custom metadata support
- **Retention**: Auto-delete old logs after 2 years

## API Endpoints

### Organizations
- `POST /organizations` - Create new organization
- `GET /organizations` - List organizations (with filters)
- `GET /organizations/:id` - Get organization details
- `PATCH /organizations/:id` - Update organization
- `DELETE /organizations/:id` - Soft delete organization

### Invitations
- `POST /invitations/organizations/:organizationId` - Send invitation
- `POST /invitations/accept` - Accept invitation with token
- `GET /invitations/organizations/:organizationId` - List invitations
- `DELETE /invitations/:id` - Revoke invitation

### Memberships
- `GET /memberships/users/:userId/organizations` - Get user's organizations
- `GET /memberships/organizations/:organizationId/members` - Get organization members
- `PATCH /memberships/:id/roles` - Update member roles
- `DELETE /memberships/:id` - Remove member

### Relations
- `POST /relations/organizations/:organizationId` - Create relation
- `GET /relations/organizations/:organizationId` - Get organization relations
- `PATCH /relations/:id` - Update relation
- `DELETE /relations/:id` - Delete relation

## Data Models

### Organization
- Basic info: name, internationalName, type, status
- Legal: taxId, legalRepresentative, foundedDate, country
- Contact: contactPhone, contactEmail, headquartersAddress
- Additional: description, website, metadata

### OrganizationRelation
- parentId, childId, relationType
- sharePercentage, effectiveDate, endDate
- status, notes, metadata

### OrganizationMember
- organizationId, userId, roles
- status, joinedAt, leftAt
- isPrimaryOwner, metadata

### OrganizationInvitation
- organizationId, inviteeEmail/Username/UserId
- roles, scope, tokenHash
- status, expiresAt, acceptedAt, revokedAt
- invitedBy, acceptedBy, message

## Environment Variables

```bash
# Service Port
TENANT_SERVICE_PORT=3005

# Invitation Configuration
INVITE_EXPIRY_DAYS=7                                   # Days before invitation expires
INVITE_SECRET=your-invite-secret-change-in-production   # Secret for token hashing
MAX_INVITES_PER_DAY=50                                 # Rate limit

# MongoDB (shared)
MONGODB_URI=mongodb://localhost:27017
MONGODB_USER=erp_user
MONGODB_PASS=erp_password
MONGODB_DB=open_erp

# RabbitMQ (shared)
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_USER=admin
RABBITMQ_PASS=admin123
```

## Database Collections

### organizations
- Indexes: taxId+country (unique), name, type, status, createdBy
- Text search: name, internationalName, description
- TTL: 730 days after soft delete

### organization_relations
- Indexes: parentId+childId+deletedAt (unique), parentId, childId, relationType
- TTL: 730 days after soft delete

### organization_members
- Indexes: organizationId+userId (unique), organizationId+isPrimaryOwner (unique for primary)
- Roles index for efficient role-based queries
- TTL: 730 days after soft delete

### organization_invitations
- Indexes: tokenHash (unique), organizationId+inviteeEmail+status (unique for pending)
- Auto-expire: 30 days after expiry date
- TTL: 90 days after soft delete

### organization_audit_events
- Indexes: organizationId+createdAt, userId+createdAt, eventType+createdAt
- TTL: 730 days (2 years)

## Running the Service

### Development
```bash
npm run start:organization:dev
```

### Build
```bash
npm run build:organization
```

### Production (Docker)
```bash
docker compose up organization-service
```

## Swagger Documentation

Access API documentation at: `http://localhost:3005/docs`

OpenAPI JSON: `http://localhost:3005/api-docs.json`

## Security Features

- **Token Hashing**: Invitation tokens are SHA-256 hashed with secret
- **Single Use**: Tokens invalidated after use
- **Expiry**: Configurable token expiration
- **Audit Logging**: All sensitive operations logged
- **Soft Delete**: Data retention with recovery capability
- **Input Validation**: class-validator on all DTOs
- **Type Safety**: Full TypeScript with strict mode

## Future Enhancements

- [ ] Cycle detection for organization hierarchies
- [ ] Full RBAC enforcement with permission checks
- [ ] Rate limiting for invitations
- [ ] JWT authentication integration
- [ ] User lookup via RPC to user service
- [ ] Email notifications for invitations
- [ ] Comprehensive test suite
- [ ] Advanced hierarchy queries (get all descendants/ancestors)

## Development Notes

### Placeholder User ID
Currently, controllers use `'temp-user-id'` as a placeholder. This will be replaced with actual JWT user ID extraction once authentication middleware is integrated.

### Type Casting
Some repository methods use `as any` casting for Mongoose ObjectId to string conversion. This is a known limitation with Mongoose TypeScript typings and doesn't affect runtime behavior.

## Architecture

The service follows standard NestJS architecture:
- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic and orchestration
- **Repositories**: Data access layer
- **DTOs**: Request/response validation
- **Schemas**: MongoDB document models

## RabbitMQ Integration

**Exchanges**: erp.events, erp.rpc, erp.dlx

**Queues**: 
- organization.events - Organization/membership/invitation events
- organization.rpc - RPC requests from other services
- organization.dlx - Dead letter queue

**Event Types**:
- `organization.organization.created/updated/deleted`
- `organization.member.invited/joined/removed`
- `organization.invitation.accepted`
- `organization.relation.created/updated`

## License

UNLICENSED - Private project
