# GeoJSON Geometry Support for Administrative Divisions

This document describes the GeoJSON geometry support implementation for Province, District, and Ward entities.

## Overview

The system now supports storing and querying GeoJSON geometries (Polygon/MultiPolygon) for administrative divisions, enabling map visualization and spatial queries.

## Schema Extensions

All three entities (Province, District, Ward) have been extended with the following fields:

- `geometry`: GeoJSON object (Polygon | MultiPolygon) - Full resolution geometry
- `geometrySimplified`: GeoJSON object - Simplified version for list views
- `centroid`: { lat: Number, lon: Number } - Calculated center point
- `bbox`: [minLon, minLat, maxLon, maxLat] - Bounding box
- `areaSqKm`: Number - Area in square kilometers
- `geometrySource`: enum('gov', 'uploaded', 'manual') - Data source
- `geometryVersion`: Number - Version number for tracking
- `geometryUpdatedAt`: Date - Last update timestamp
- `geometryUpdatedBy`: String - User ID who updated
- `geometryMeta`: Object - Additional metadata (CRS, accuracy, etc.)

## API Endpoints

### Province Geometry Endpoints

#### Get Geometry
```http
GET /provinces/:code/geometry?detail=full
```
Returns geometry data for a province. Use `detail=simple` for simplified geometry.

#### Update Geometry
```http
PATCH /provinces/:code/geometry
Authorization: Bearer <token>
Content-Type: application/json

{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[105.0, 20.0], [106.0, 20.0], [106.0, 21.0], [105.0, 21.0], [105.0, 20.0]]]
  },
  "geometrySource": "gov",
  "geometryMeta": {
    "crs": "EPSG:4326",
    "accuracy": 100
  }
}
```
**Note**: Requires ADMIN or SYSTEM_ADMIN role.

#### Import GeoJSON FeatureCollection
```http
POST /provinces/import-geojson
Authorization: Bearer <token>
Content-Type: application/json

{
  "featureCollection": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": { "code": "P01" },
        "geometry": {
          "type": "Polygon",
          "coordinates": [...]
        }
      }
    ]
  },
  "geometrySource": "gov",
  "simplificationTolerance": 0.01
}
```
**Note**: Requires ADMIN or SYSTEM_ADMIN role. Features are matched by `code` property.

#### Export Geometry
```http
GET /provinces/:code/export?format=geojson&detail=full
```
Returns a GeoJSON Feature with province data and geometry.

#### Get Version History
```http
GET /provinces/:code/geometry/versions?limit=10
```
Returns version history of geometry updates.

#### Rollback to Version
```http
POST /provinces/:code/geometry/rollback/:version
Authorization: Bearer <token>
```
**Note**: Requires ADMIN or SYSTEM_ADMIN role.

### Spatial Query Endpoints

#### Find Regions Within Bounding Box
```http
GET /regions/within?bbox=105.0,20.0,106.0,21.0&type=all&detail=simple
```
Parameters:
- `bbox`: minLon,minLat,maxLon,maxLat (required)
- `type`: province|district|ward|all (default: all)
- `detail`: simple|full (default: simple)

Returns provinces, districts, and/or wards within the bounding box.

#### Find Regions Near Point
```http
GET /regions/near?lon=105.8542&lat=21.0285&radius=10000&type=all
```
Parameters:
- `lon`: Longitude (required)
- `lat`: Latitude (required)
- `radius`: Maximum distance in meters (optional)
- `type`: province|district|ward|all (default: all)
- `detail`: simple|full (default: simple)

## Migration

Run the migration to create indexes and geometry_versions collection:

```bash
npm run db:migrate
```

This will:
1. Create `geometry_versions` collection for audit trail
2. Create 2dsphere indexes on all three collections (provinces, districts, wards)
3. Create centroid indexes for faster point queries

## Usage Examples

### Import Official Government Data

1. Obtain GeoJSON data for Vietnamese administrative divisions
2. Format as FeatureCollection with `code` property in each feature
3. POST to `/provinces/import-geojson` endpoint

### Query Provinces in a Region

```javascript
// Get all provinces in North Vietnam
const response = await fetch('/regions/within?bbox=102.0,20.0,110.0,24.0&type=province&detail=simple');
const data = await response.json();
console.log(data.data.provinces);
```

### Find Nearest Administrative Division

```javascript
// Find provinces, districts, and wards within 50km of Hanoi
const response = await fetch('/regions/near?lon=105.8542&lat=21.0285&radius=50000&type=all');
const data = await response.json();
```

### Display on Map (Frontend)

```javascript
// Using Leaflet
const response = await fetch('/provinces/P01/geometry?detail=simple');
const { data } = await response.json();

const layer = L.geoJSON(data.geometry, {
  style: { color: '#3388ff' }
}).addTo(map);

// Fit map to bounds
map.fitBounds([
  [data.bbox[1], data.bbox[0]], // SW corner
  [data.bbox[3], data.bbox[2]]  // NE corner
]);
```

## Data Validation

The system validates:
- GeoJSON structure (must be valid GeoJSON)
- Geometry type (must be Polygon or MultiPolygon)
- Coordinate bounds (lon: -180 to 180, lat: -90 to 90)
- Self-intersections (geometries with self-intersections are rejected)
- File size (default max 10MB)

## Security

- Only users with ADMIN or SYSTEM_ADMIN roles can:
  - Update geometries
  - Import GeoJSON data
  - Rollback to previous versions
- All geometry updates are tracked in version history
- Rate limiting is applied to prevent abuse

## Performance Considerations

- Use `detail=simple` for list views and map previews to reduce payload size
- Use `detail=full` only when detailed boundary visualization is needed
- The system automatically creates simplified versions during import
- 2dsphere indexes enable efficient spatial queries
- Centroid indexes enable fast point-based queries

## Data Sources

The `geometrySource` field tracks the origin of geometry data:
- `gov`: Official government data
- `uploaded`: User-uploaded data
- `manual`: Manually created/edited

## Future Enhancements

- WKT format support (currently only GeoJSON)
- CRS conversion (currently only EPSG:4326/WGS84 supported)
- Similar CRUD endpoints for districts and wards
- Automated import from official Vietnamese government sources
- Spatial intersection queries (e.g., find all districts in a custom polygon)
