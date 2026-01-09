# Navigation API Documentation

## Overview

The Navigation API provides a comprehensive system for managing dynamic navigation menus (vertical layouts) for both global and module-scoped navigation structures. It supports hierarchical parent-child relationships, permission-based filtering, caching, and full CRUD operations.

## Features

- **Hierarchical Structure**: Parent-child relationships with cycle detection
- **Scope Management**: Support for global and module-specific navigation
- **Permission Filtering**: Server-side filtering based on user permissions
- **Caching**: In-memory caching with TTL for performance
- **Full CRUD**: Create, Read, Update, Delete operations
- **Search**: Text search across navigation items
- **Security**: XSS protection and RBAC authorization
- **Ordering**: Configurable order for sibling items

## Data Model

### NavigationItem Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `label` | string | Yes | Display label |
| `icon` | string | No | Icon identifier (e.g., FontAwesome class) |
| `subtitle` | string | No | Subtitle or description |
| `routerLink` | string | No | Angular router link path |
| `url` | string | No | External URL (alternative to routerLink) |
| `permissions` | object | No | Permission configuration (include/exclude) |
| `command` | string | No | Client-side command function name |
| `items` | array | No | Child navigation items (IDs) |
| `disabled` | boolean | No | Whether the item is disabled |
| `target` | string | No | Link target (_blank, _self, etc.) |
| `badge` | string | No | Badge text or number |
| `tooltip` | string | No | Tooltip text |
| `shortcut` | string | No | Keyboard shortcut (e.g., "Ctrl+D") |
| `class` | string | No | CSS class |
| `iconStyle` | string | No | Inline styles for icon |
| `iconClass` | string | No | CSS class for icon |
| `labelStyle` | string | No | Inline styles for label |
| `labelClass` | string | No | CSS class for label |
| `linkStyle` | string | No | Inline styles for link |
| `linkClass` | string | No | CSS class for link |
| `order` | number | No | Order/position among siblings (default: 0) |
| `scope` | enum | Yes | 'global' or 'module' |
| `module` | string | Conditional | Module key (required when scope='module') |
| `parentId` | string | No | Parent navigation item ID |
| `meta` | object | No | Free-form metadata |
| `createdBy` | string | Yes | User ID who created |
| `updatedBy` | string | Yes | User ID who last updated |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

### Permission Configuration

```json
{
  "include": ["user.read", "user.write"],
  "exclude": ["admin.only"]
}
```

- **include**: User must have at least one of these permissions
- **exclude**: User must NOT have any of these permissions

## API Endpoints

### User-Facing Endpoints

#### GET /v1/navigations/user

**NEW** - Returns navigation filtered by authenticated user's permissions. Automatically extracts permissions from JWT token.

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**
- `scope` (optional): Navigation scope - `global` or `module`. Default: `global`
- `moduleKey` (optional): Module key (required when scope=module). Example: `inventory`
- `format` (optional): Response format - `tree` or `flat`. Default: `tree`

**Headers:**
- `Authorization`: Bearer <token> (required)
- `If-None-Match`: ETag for conditional requests (optional)

**Response (Tree Format):**
```json
{
  "success": true,
  "message": "Navigation retrieved successfully",
  "error": null,
  "data": {
    "mode": "get",
    "item": {
      "items": [
        {
          "id": "nav-dashboard",
          "label": "Dashboard",
          "icon": "pi pi-home",
          "routerLink": "/dashboard",
          "scope": "global",
          "order": 1,
          "items": [...]
        }
      ],
      "scope": "global",
      "format": "tree",
      "total": 1
    }
  },
  "meta": {
    "etag": "\"abc123\""
  }
}
```

**Response (Flat Format):**
```json
{
  "success": true,
  "message": "Navigation retrieved successfully",
  "error": null,
  "data": {
    "mode": "get",
    "item": {
      "items": [
        {
          "id": "nav-dashboard",
          "label": "Dashboard",
          "icon": "pi pi-home",
          "routerLink": "/dashboard",
          "scope": "global",
          "order": 1
        },
        {
          "id": "nav-dashboard-overview",
          "label": "Overview",
          "routerLink": "/dashboard/overview",
          "scope": "global",
          "order": 1,
          "parentId": "nav-dashboard"
        }
      ],
      "scope": "global",
      "format": "flat",
      "total": 2
    }
  },
  "meta": {
    "etag": "\"abc123\""
  }
}
```

**Status Codes:**
- `200 OK`: Navigation retrieved successfully
- `304 Not Modified`: Content not modified (when ETag matches)
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid token

**Examples:**
```bash
# Get global navigation in tree format
curl -X GET "https://api.example.com/api/v1/navigations/user" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get global navigation in flat format
curl -X GET "https://api.example.com/api/v1/navigations/user?format=flat" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get module-specific navigation
curl -X GET "https://api.example.com/api/v1/navigations/user?scope=module&moduleKey=inventory" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Features:**
- ✅ Automatic permission extraction from JWT
- ✅ Server-side permission filtering
- ✅ ETag-based client caching
- ✅ Tree and flat format support
- ✅ SYSTEM_ADMIN bypass

---

#### GET /v1/navigations/preview

**NEW** - Preview navigation as a specific role (admin only). Useful for testing and debugging.

**Authentication:** Required (SYSTEM_ADMIN role)

**Query Parameters:**
- `asRole` (required): Role code to preview as (e.g., `USER`, `MANAGER`)
- `scope` (optional): Navigation scope - `global` or `module`. Default: `global`
- `moduleKey` (optional): Module key (required when scope=module)
- `format` (optional): Response format - `tree` or `flat`. Default: `tree`

**Response:**
```json
{
  "success": true,
  "message": "Navigation preview for role 'USER'",
  "error": null,
  "data": {
    "mode": "get",
    "item": {
      "items": [...],
      "scope": "global",
      "format": "tree",
      "total": 5,
      "previewRole": "USER"
    }
  }
}
```

**Status Codes:**
- `200 OK`: Preview retrieved successfully
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User is not SYSTEM_ADMIN

**Examples:**
```bash
# Preview navigation for USER role
curl -X GET "https://api.example.com/api/v1/navigations/preview?asRole=USER" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Preview module navigation for MANAGER role
curl -X GET "https://api.example.com/api/v1/navigations/preview?asRole=MANAGER&scope=module&moduleKey=inventory&format=flat" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### Legacy Endpoints (for backward compatibility)

#### GET /v1/navigations/global

Returns the full global navigation tree, optionally filtered by user permissions.

**Query Parameters:**
- `permissions` (optional): Comma-separated list of permission keys

**Example:**
```bash
GET /v1/navigations/global?permissions=user.read,user.write
```

**Response:**
```json
{
  "success": true,
  "message": "Global navigation retrieved successfully",
  "error": null,
  "data": {
    "mode": "get",
    "item": {
      "items": [...],
      "scope": "global",
      "total": 1
    }
  }
}
```

#### GET /v1/navigations/module/:moduleKey

Returns navigation tree scoped to the specified module.

**Path Parameters:**
- `moduleKey`: Module identifier (e.g., 'inventory', 'sales')

**Query Parameters:**
- `permissions` (optional): Comma-separated permission keys

**Example:**
```bash
GET /v1/navigations/module/inventory?permissions=inventory.read
```

### GET /v1/navigations/:id

Retrieves a specific navigation item with its children.

**Path Parameters:**
- `id`: Navigation item ID

**Example:**
```bash
GET /v1/navigations/nav-dashboard
```

### POST /v1/navigations

Creates a new navigation item. **Requires SYSTEM_ADMIN or NAV_ADMIN role.**

**Request Body:**
```json
{
  "id": "nav-dashboard",
  "label": "Dashboard",
  "icon": "pi pi-home",
  "routerLink": "/dashboard",
  "scope": "global",
  "order": 1,
  "permissions": {
    "include": ["user.read"]
  }
}
```

**Response:** 201 Created with the created navigation item

### PATCH /v1/navigations/:id

Updates an existing navigation item. **Requires SYSTEM_ADMIN or NAV_ADMIN role.**

**Path Parameters:**
- `id`: Navigation item ID

**Request Body:**
```json
{
  "label": "Updated Dashboard",
  "order": 2
}
```

### DELETE /v1/navigations/:id

Deletes a navigation item. **Requires SYSTEM_ADMIN or NAV_ADMIN role.**

**Path Parameters:**
- `id`: Navigation item ID

**Query Parameters:**
- `cascade` (optional, default: true): Whether to delete children recursively

**Example:**
```bash
DELETE /v1/navigations/nav-dashboard?cascade=true
```

### POST /v1/navigations/:id/move

Moves a navigation item to a new parent and/or position. **Requires SYSTEM_ADMIN or NAV_ADMIN role.**

**Path Parameters:**
- `id`: Navigation item ID to move

**Request Body:**
```json
{
  "newParentId": "nav-settings",
  "order": 2
}
```

### GET /v1/navigations/search

Searches for navigation items by label, icon, command, or subtitle.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional, default: 50): Maximum number of results

**Example:**
```bash
GET /v1/navigations/search?q=dashboard&limit=10
```

### POST /v1/navigations/cache/reload

Reloads/invalidates the navigation cache. **Requires SYSTEM_ADMIN role.**

**Query Parameters:**
- `scope` (optional): Scope to reload ('global' or 'module')
- `module` (optional): Module key (when scope is 'module')

## RPC Methods

For inter-service communication, the following RPC methods are available:

```typescript
import { RPC_METHODS } from '@shared/constants/message.constants';

// Get global navigation
RPC_METHODS.CONFIG.GET_NAVIGATION_GLOBAL

// Get module navigation
RPC_METHODS.CONFIG.GET_NAVIGATION_MODULE

// Reload navigation cache
RPC_METHODS.CONFIG.RELOAD_NAVIGATION_CACHE
```

## Events

The Navigation API emits the following events:

```typescript
import { EVENT_NAMES } from '@shared/constants/message.constants';

// Navigation created
EVENT_NAMES.NAVIGATION.CREATED

// Navigation updated
EVENT_NAMES.NAVIGATION.UPDATED

// Navigation deleted
EVENT_NAMES.NAVIGATION.DELETED

// Navigation moved
EVENT_NAMES.NAVIGATION.MOVED
```

## Usage Examples

### Creating a Global Navigation Menu

```bash
# Create root dashboard item
POST /v1/navigations
{
  "id": "nav-dashboard",
  "label": "Dashboard",
  "icon": "pi pi-home",
  "routerLink": "/dashboard",
  "scope": "global",
  "order": 1
}

# Create settings item with submenu
POST /v1/navigations
{
  "id": "nav-settings",
  "label": "Settings",
  "icon": "pi pi-cog",
  "scope": "global",
  "order": 2
}

# Create settings child
POST /v1/navigations
{
  "id": "nav-settings-profile",
  "label": "Profile",
  "icon": "pi pi-user",
  "routerLink": "/settings/profile",
  "scope": "global",
  "parentId": "nav-settings",
  "order": 1
}
```

### Creating Module-Specific Navigation

```bash
POST /v1/navigations
{
  "id": "nav-inventory-products",
  "label": "Products",
  "icon": "pi pi-box",
  "routerLink": "/inventory/products",
  "scope": "module",
  "module": "inventory",
  "order": 1,
  "permissions": {
    "include": ["inventory.read"]
  }
}
```

### Fetching Navigation with Permission Filtering

```bash
# Client requests navigation with their permissions
GET /v1/navigations/global?permissions=user.read,inventory.read

# Server returns only items the user can access
```

## Security

### XSS Protection

The API automatically sanitizes the following fields to prevent XSS attacks:
- `label`
- `subtitle`
- `tooltip`

Dangerous patterns like `<script>`, `javascript:`, `onerror=`, `onload=` are rejected.

### Authorization

- **Reading navigation**: Requires `navigation.read` permission
- **Creating/updating/deleting**: Requires `SYSTEM_ADMIN` or `NAV_ADMIN` role
- **Cache management**: Requires `SYSTEM_ADMIN` role

### Validation

- `routerLink` must start with `/` or `./`
- `shortcut` must follow format like `Ctrl+D`, `Alt+Shift+S`
- `id` must contain only alphanumeric characters, hyphens, and underscores
- Circular references are prevented automatically

## Caching

The Navigation API uses in-memory caching with a 5-minute TTL:

- Cache keys are based on scope, module, and permissions
- Cache is automatically invalidated on create, update, delete, or move operations
- Admins can manually reload cache using the `/cache/reload` endpoint

## Database Indexes

The following indexes are created for optimal performance:

- `{ id: 1 }` - Unique index
- `{ scope: 1, module: 1, order: 1 }` - Compound index
- `{ scope: 1, parentId: 1 }` - Compound index
- `{ module: 1, order: 1 }` - Compound index
- `{ parentId: 1 }` - Single field index
- Text index on `label` and `command` for search

## Migration

Run the migration to create the navigations collection:

```bash
npm run db:migrate
```

This will execute the migration file:
- `20260108000001-create-navigations-collection.js`

## Testing

Run the navigation service tests:

```bash
npm test apps/config-service/test/navigation.service.spec.ts
```

## Client Integration

### Loading Global Navigation

```typescript
// On app initialization
const response = await fetch('/v1/navigations/global?permissions=' + userPermissions.join(','));
const { items } = await response.json();
// Render items in vertical sidebar
```

### Loading Module Navigation

```typescript
// When user enters a module
const response = await fetch('/v1/navigations/module/inventory?permissions=' + userPermissions.join(','));
const { items } = await response.json();
// Merge with or replace global navigation
```

## Best Practices

1. **Use meaningful IDs**: Use descriptive IDs like `nav-inventory-products` instead of generic IDs
2. **Set appropriate permissions**: Always specify permission requirements for sensitive items
3. **Organize hierarchically**: Use parent-child relationships to create logical menu groups
4. **Order thoughtfully**: Use the `order` field to control menu item sequence
5. **Cache wisely**: The API caches navigation trees, so updates may take up to 5 minutes to propagate (or use cache reload)
6. **Test permissions**: Always test navigation with different user permission sets
7. **Use tooltips**: Provide helpful tooltips for complex or abbreviated menu items

## Troubleshooting

### Navigation not showing up

- Check that the user has the required permissions
- Verify the scope and module are correct
- Ensure the navigation item is not disabled
- Check parent-child relationships are valid

### Circular reference error

- Cannot set a navigation item as its own parent
- Cannot create a cycle where A → B → C → A
- Use the move endpoint carefully to avoid cycles

### Cache not updating

- Wait up to 5 minutes for cache TTL to expire
- Or manually reload cache with `POST /v1/navigations/cache/reload`
- Check that the update operation succeeded

## Support

For issues or questions, refer to:
- API documentation: OpenAPI/Swagger at `/api/docs`
- Source code: `apps/config-service/src/controllers/navigation.controller.ts`
- Tests: `apps/config-service/test/navigation.service.spec.ts`
