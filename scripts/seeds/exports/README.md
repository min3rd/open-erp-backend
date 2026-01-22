# Navigation Seed Exports

This directory contains i18n translation key exports from the navigation seed script.

When running the seed script with `--export-i18n`, a JSON file is generated containing all navigation labels mapped to their Transloco keys.

Example export filename:
```
navigation-i18n-en-2026-01-22T06-56-19-042Z.json
```

## Export Structure

```json
{
  "navigation.demo": "Demo",
  "navigation.modules": "Modules",
  "navigation.modules.organization": "Organization",
  "navigation.modules.management": "Management",
  "navigation.modules.management.user": "User Management"
}
```

## Usage

Copy the exported keys into your frontend i18n files:

1. Run seed script with i18n export:
   ```bash
   npm run db:seed:navigation -- --export-i18n --confirm
   ```

2. Find the generated file in this directory

3. Copy contents to frontend i18n files:
   - `open-erp-web/public/i18n/en.json`
   - `open-erp-web/public/i18n/vi.json` (translate values)

**Note**: Export files are not committed to version control (see `.gitignore`).
