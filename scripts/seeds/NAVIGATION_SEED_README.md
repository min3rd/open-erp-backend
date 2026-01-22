# Navigation Seed Script

## Overview

The navigation seed script (`seed-navigation.ts`) automates the creation and synchronization of navigation (menu items) data from the frontend repository into the backend database. This enables rapid population of navigation structure (global/module menus, routes, labels, icons, permissions, ordering, parent relationships) into the database for use in dashboard menu configuration.

## Features

- ✅ Reads navigation data from JSON manifest or frontend repository
- ✅ Idempotent upsert operations (safe to run multiple times)
- ✅ Preserves parent-child hierarchy
- ✅ Auto-generates slugified IDs
- ✅ Generates Transloco i18n keys
- ✅ Exports i18n translation keys to JSON
- ✅ Dry-run mode for preview
- ✅ Comprehensive validation
- ✅ Execution reports
- ✅ Route prefix support
- ✅ Skip existing items option

## Installation

The script is already set up in the project. Dependencies:

```bash
npm install
```

## Usage

### Basic Usage

```bash
# Dry run (preview without making changes)
npm run db:seed:navigation -- --dry-run

# Seed from sample manifest (requires --confirm)
npm run db:seed:navigation -- --confirm

# Seed from custom JSON file
npm run db:seed:navigation -- --file path/to/manifest.json --confirm
```

### CLI Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--source <fe\|file>` | Source of navigation data | `file` | `--source file` |
| `--file <path>` | Path to JSON manifest file | Sample manifest | `--file /path/to/nav.json` |
| `--dry-run` | Preview without database writes | `false` | `--dry-run` |
| `--confirm` | Confirm database writes (required) | `false` | `--confirm` |
| `--prefix <string>` | Route prefix to prepend | none | `--prefix /admin` |
| `--skip-existing` | Skip existing items (don't update) | `false` | `--skip-existing` |
| `--export-i18n` | Export i18n translation keys | `false` | `--export-i18n` |
| `--push-api <url>` | Use API endpoint instead of direct DB | none | `--push-api https://api...` |
| `--drop` | Drop all navigation items before seeding | `false` | `--drop --confirm` |

### Examples

#### Preview Changes

```bash
npm run db:seed:navigation -- --dry-run
```

Output:
```
╔════════════════════════════════════════════════════════════╗
║           Navigation Seed Script                          ║
╚════════════════════════════════════════════════════════════╝

=== DRY RUN MODE - No database changes will be made ===

[1] nav-demo
    Label: Demo
    Route: /demo
    Scope: global

[2] nav-modules
    Label: Modules
    Route: /modules
    Scope: global
...
```

#### Seed from Custom File

```bash
npm run db:seed:navigation -- --file ./my-navigation.json --confirm
```

#### Seed with Route Prefix

```bash
npm run db:seed:navigation -- --prefix /app --confirm
```

This will prepend `/app` to all routes, e.g., `/demo` becomes `/app/demo`.

#### Skip Existing Items

```bash
npm run db:seed:navigation -- --skip-existing --confirm
```

Only inserts new items, doesn't update existing ones.

#### Export i18n Keys

```bash
npm run db:seed:navigation -- --export-i18n --dry-run
```

Creates a file in `scripts/seeds/exports/` with translation keys:

```json
{
  "navigation.demo": "Demo",
  "navigation.modules": "Modules",
  "navigation.modules.organization": "Organization",
  ...
}
```

Copy these keys into your frontend i18n files (e.g., `public/i18n/en.json`).

#### Drop and Recreate

```bash
npm run db:seed:navigation -- --drop --confirm
```

⚠️ **Warning**: This deletes all existing navigation items!

## Manifest Format

### JSON Manifest Structure

The script expects a JSON file with the following structure:

```json
{
  "navigation": [
    {
      "id": "nav-dashboard",
      "label": "Dashboard",
      "labelKey": "navigation.dashboard",
      "route": "/dashboard",
      "icon": "pi pi-home",
      "module": "main",
      "scope": "global",
      "order": 1,
      "permissions": {
        "include": ["dashboard.view"]
      }
    },
    {
      "id": "nav-users",
      "label": "User Management",
      "labelKey": "navigation.users",
      "route": "/users",
      "icon": "pi pi-users",
      "module": "admin",
      "scope": "module",
      "moduleId": "admin",
      "parentId": "nav-admin",
      "order": 1,
      "permissions": {
        "include": ["users.read"]
      }
    }
  ]
}
```

### Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| `id` | No | Unique identifier (auto-generated from label if not provided) |
| `label` | Yes | Display label for the menu item |
| `labelKey` | No | Transloco i18n key (auto-generated if not provided) |
| `route` | No | Angular route path |
| `routerLink` | No | Alternative to `route` |
| `icon` | No | Icon class (e.g., PrimeNG icons: `pi pi-home`) |
| `module` | No | Module identifier |
| `scope` | No | `global` or `module` (default: `global`) |
| `moduleId` | No | Module ID when scope is `module` |
| `parentId` | No | Parent navigation item ID (for nested menus) |
| `order` | No | Sort order (default: 0) |
| `permissions` | No | Permission configuration object |
| `permissions.include` | No | Array of required permissions (user must have at least one) |
| `permissions.exclude` | No | Array of excluded permissions (user must not have any) |
| `meta` | No | Custom metadata object |

### Sample Manifest

A sample manifest is provided at `scripts/seeds/data/navigation-manifest-sample.json` with navigation items based on the frontend routes.

## Database Schema

Navigation items are stored in the `navigations` collection with the following schema:

```typescript
{
  id: string;              // Unique identifier
  label: string;           // Display label
  icon?: string;           // Icon class
  routerLink?: string;     // Route path
  scope: 'global' | 'module';
  moduleId?: string;       // Module identifier
  parentId?: string;       // Parent item ID
  order: number;           // Sort order
  permissions?: {
    include?: string[];
    exclude?: string[];
  };
  meta?: object;           // Custom metadata
  createdBy: string;       // Creator (always 'script')
  updatedBy: string;       // Updater (always 'script')
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Update timestamp
}
```

## Auto-Generation

### ID Generation

If no `id` is provided, the script generates one by:
1. Slugifying the label (converting to lowercase, replacing spaces with dashes)
2. Prefixing with `nav-` (or `{parentId}-` if nested)

Examples:
- "User Management" → `nav-user-management`
- "Settings" → `nav-settings`
- Child of "nav-admin" → `nav-admin-settings`

### Label Key Generation

If no `labelKey` is provided, the script generates a Transloco key:
1. Remove `nav-` prefix from ID
2. Convert dashes to dots
3. Prefix with `navigation.`

Examples:
- `nav-dashboard` → `navigation.dashboard`
- `nav-admin-users` → `navigation.admin.users`

## Validation

The script validates:
- ✅ Unique IDs (no duplicates)
- ✅ Unique routes (no duplicates)
- ✅ Parent references (warns if parent not found)
- ✅ Required fields (label)

Validation errors are displayed before any database operations.

## Reports

Execution reports are saved to `scripts/seeds/reports/` with timestamp:

```
2026-01-22T06-56-09-679Z-seed-navigation-report.json
```

Report structure:

```json
{
  "scriptName": "seed-navigation",
  "timestamp": "2026-01-22T06:56:09.679Z",
  "options": {
    "source": "file",
    "dryRun": false,
    "confirm": true
  },
  "stats": {
    "total": 11,
    "inserted": 8,
    "updated": 3,
    "skipped": 0,
    "errors": 0
  },
  "duration": 1234,
  "success": true
}
```

## Idempotency

The script is idempotent - running it multiple times with the same data produces the same result:

- **First run**: Inserts new items
- **Subsequent runs**: Updates existing items (unless `--skip-existing` is used)
- Uses `id` field for matching

This makes it safe to run the script repeatedly during development or deployment.

## Integration with Frontend

### Workflow

1. **Extract navigation from frontend**:
   - Create a JSON manifest from `app.routes.ts` or navigation service
   - Include all menu items with their properties

2. **Run seed script**:
   ```bash
   npm run db:seed:navigation -- --file frontend-nav.json --export-i18n --confirm
   ```

3. **Copy i18n keys**:
   - Find exported file in `scripts/seeds/exports/`
   - Copy keys to frontend `public/i18n/en.json`

4. **Verify in database**:
   - Check `navigations` collection in MongoDB
   - Test via config-service API endpoints

### API Endpoints

After seeding, navigation data is available via config-service:

```
GET /api/v1/navigations/user        # User's filtered navigation
GET /api/v1/navigations/global      # Global navigation
GET /api/v1/navigations/module/:id  # Module-specific navigation
```

## Testing

### Unit Tests

```bash
npm test -- scripts/seeds/__tests__/seed-navigation.spec.ts
```

Tests cover:
- ✅ CLI argument parsing
- ✅ Manifest item to document conversion
- ✅ ID generation (slugify)
- ✅ Label key generation
- ✅ Route handling and prefix application
- ✅ Permission preservation
- ✅ Parent-child relationships

### Manual Testing

1. **Test with dry-run**:
   ```bash
   npm run db:seed:navigation -- --dry-run
   ```

2. **Test with sample data**:
   ```bash
   npm run db:seed:navigation -- --confirm
   ```

3. **Verify in MongoDB**:
   ```bash
   mongo open_erp
   db.navigations.find().pretty()
   ```

4. **Test API endpoints**:
   ```bash
   curl http://localhost:3000/api/v1/navigations/global
   ```

## Troubleshooting

### Issue: Duplicate ID error

**Cause**: Two items have the same `id` or generate the same ID from their labels.

**Solution**: 
- Provide explicit unique IDs in the manifest
- Or ensure labels are unique

### Issue: Parent not found warning

**Cause**: `parentId` references an item that doesn't exist.

**Solution**:
- Ensure parent items are listed before child items in the manifest
- Or create parent items first

### Issue: Route conflict

**Cause**: Two items have the same route.

**Solution**:
- Make routes unique
- Or use different scopes/modules

### Issue: Connection refused

**Cause**: MongoDB is not running or credentials are incorrect.

**Solution**:
- Start MongoDB: `docker-compose up -d`
- Check `.env` file for correct credentials
- Verify connection: `npm run db:test`

## Best Practices

1. **Always dry-run first**: Preview changes before applying
   ```bash
   npm run db:seed:navigation -- --dry-run
   ```

2. **Export i18n keys**: Keep frontend translations in sync
   ```bash
   npm run db:seed:navigation -- --export-i18n --dry-run
   ```

3. **Use explicit IDs**: Avoid auto-generation for important items
   ```json
   {
     "id": "nav-dashboard",
     "label": "Dashboard"
   }
   ```

4. **Order items logically**: Use `order` field for consistent sorting
   ```json
   {
     "order": 1
   }
   ```

5. **Document permissions**: Include permission requirements
   ```json
   {
     "permissions": {
       "include": ["dashboard.view"]
     }
   }
   ```

6. **Keep manifest in version control**: Track navigation changes over time

## Future Enhancements

Planned features:

- [ ] Parse TypeScript route files directly from frontend repo
- [ ] API push mode (use config-service API instead of direct DB)
- [ ] Support for multiple manifest files
- [ ] Diff mode (show what changed since last run)
- [ ] Migration mode (update existing items only)
- [ ] Badge and tooltip support
- [ ] Command execution support

## Contributing

When adding new navigation items:

1. Add to the manifest JSON file
2. Run the seed script
3. Export and update i18n keys
4. Test via API endpoints
5. Commit manifest and i18n changes

## Related Documentation

- [Seed Scripts Guide](../../SEED_SCRIPTS_GUIDE.md)
- [Navigation API Documentation](../../apps/config-service/NAVIGATION_API.md)
- [Frontend Navigation Service](https://github.com/min3rd/open-erp-web/src/core/services/navigation-service.ts)

## Support

For issues or questions:
- Check the [Seed Scripts Guide](../../SEED_SCRIPTS_GUIDE.md)
- Review test cases in `__tests__/seed-navigation.spec.ts`
- Check execution reports in `scripts/seeds/reports/`
- Review this README

## License

This script is part of the open-erp-backend project.
