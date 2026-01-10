import { Polygon, MultiPolygon, Point } from 'geojson';

/**
 * Geometry source enumeration
 */
export enum GeometrySource {
  GOV = 'gov',           // Official government data
  UPLOADED = 'uploaded', // User uploaded
  MANUAL = 'manual',     // Manually created
}

/**
 * Centroid coordinate
 */
export interface Centroid {
  lat: number;
  lon: number;
}

/**
 * Bounding box [minLon, minLat, maxLon, maxLat]
 */
export type BBox = [number, number, number, number];

/**
 * Geometry metadata
 */
export interface GeometryMeta {
  crs?: string;               // Coordinate Reference System (e.g., 'EPSG:4326')
  simplificationLevel?: number; // 0-10, higher means more simplified
  accuracy?: number;          // Accuracy in meters
  source?: string;            // Data source details
  [key: string]: any;         // Additional metadata
}

/**
 * GeoJSON geometry type for administrative divisions
 */
export type AdminGeometry = Polygon | MultiPolygon;

/**
 * Geometry detail level for API queries
 */
export enum GeometryDetail {
  SIMPLE = 'simple',
  FULL = 'full',
}
