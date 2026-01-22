# Navigation Seed Reports

This directory contains execution reports from the navigation seed script.

Reports are automatically generated when running the seed script and include:
- Timestamp
- Options used
- Statistics (inserted, updated, skipped, errors)
- Duration
- Success status

Example report filename:
```
2026-01-22T06-56-09-679Z-seed-navigation-report.json
```

## Report Structure

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

**Note**: Report files are not committed to version control (see `.gitignore`).
