import { Injectable, BadRequestException } from '@nestjs/common';
import * as turf from '@turf/turf';
import { validate as validateGeoJSON } from 'geojson-validation';
import { Polygon, MultiPolygon, FeatureCollection, Feature } from 'geojson';
import {
  AdminGeometry,
  Centroid,
  BBox,
  GeometryMeta,
} from '@shared/types/geometry.types';

/**
 * Service for geospatial operations and validation
 */
@Injectable()
export class GeometryUtilService {
  /**
   * Validate GeoJSON geometry
   */
  validateGeometry(geometry: any): void {
    if (!geometry) {
      throw new BadRequestException('Geometry is required');
    }

    // Validate GeoJSON structure
    const isValid = validateGeoJSON(geometry);
    if (!isValid) {
      throw new BadRequestException('Invalid GeoJSON format');
    }

    // Check geometry type
    if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
      throw new BadRequestException('Geometry must be Polygon or MultiPolygon');
    }

    // Check for self-intersections and invalid topology
    try {
      const feature = turf.feature(geometry);
      const kinks = turf.kinks(feature);
      if (kinks.features.length > 0) {
        throw new BadRequestException('Geometry has self-intersections');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Invalid geometry topology: ${error.message}`);
    }

    // Check coordinate bounds (must be valid lat/lon)
    this.validateCoordinateBounds(geometry);
  }

  /**
   * Validate coordinate bounds (lat: -90 to 90, lon: -180 to 180)
   */
  private validateCoordinateBounds(geometry: any): void {
    const coordinates = geometry.coordinates;
    
    const checkCoord = (coord: any) => {
      if (Array.isArray(coord[0])) {
        coord.forEach(checkCoord);
      } else {
        const [lon, lat] = coord;
        if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
          throw new BadRequestException(
            `Invalid coordinates: lon=${lon}, lat=${lat}. Must be within valid bounds.`
          );
        }
      }
    };

    coordinates.forEach(checkCoord);
  }

  /**
   * Calculate centroid from geometry
   */
  calculateCentroid(geometry: AdminGeometry): Centroid {
    const feature = turf.feature(geometry);
    const centroid = turf.centroid(feature);
    const [lon, lat] = centroid.geometry.coordinates;
    return { lat, lon };
  }

  /**
   * Calculate bounding box from geometry
   */
  calculateBBox(geometry: AdminGeometry): BBox {
    const feature = turf.feature(geometry);
    const bbox = turf.bbox(feature);
    return bbox as BBox;
  }

  /**
   * Calculate area in square kilometers
   */
  calculateArea(geometry: AdminGeometry): number {
    const feature = turf.feature(geometry);
    const areaInMeters = turf.area(feature);
    return areaInMeters / 1_000_000; // Convert to km²
  }

  /**
   * Simplify geometry to reduce size
   */
  simplifyGeometry(
    geometry: AdminGeometry,
    tolerance: number = 0.01,
  ): AdminGeometry {
    const feature = turf.feature(geometry);
    const simplified = turf.simplify(feature, {
      tolerance,
      highQuality: false,
    });
    return simplified.geometry as AdminGeometry;
  }

  /**
   * Convert CRS if needed (assumes input is EPSG:4326 or converts to it)
   */
  convertCRS(geometry: any, targetCRS: string = 'EPSG:4326'): AdminGeometry {
    // For now, we assume all input is already in EPSG:4326
    // In production, you might want to use proj4 or similar for CRS conversion
    if (targetCRS !== 'EPSG:4326') {
      throw new BadRequestException('Only EPSG:4326 (WGS84) is supported');
    }
    return geometry;
  }

  /**
   * Process geometry with all calculations
   */
  processGeometry(
    geometry: AdminGeometry,
    simplificationTolerance?: number,
  ): {
    geometry: AdminGeometry;
    geometrySimplified: AdminGeometry;
    centroid: Centroid;
    bbox: BBox;
    areaSqKm: number;
  } {
    // Validate
    this.validateGeometry(geometry);

    // Calculate properties
    const centroid = this.calculateCentroid(geometry);
    const bbox = this.calculateBBox(geometry);
    const areaSqKm = this.calculateArea(geometry);

    // Simplify for preview
    const geometrySimplified = simplificationTolerance
      ? this.simplifyGeometry(geometry, simplificationTolerance)
      : this.simplifyGeometry(geometry);

    return {
      geometry,
      geometrySimplified,
      centroid,
      bbox,
      areaSqKm,
    };
  }

  /**
   * Parse FeatureCollection and extract features by code
   */
  parseFeatureCollection(featureCollection: FeatureCollection): Map<string, Feature> {
    if (featureCollection.type !== 'FeatureCollection') {
      throw new BadRequestException('Input must be a FeatureCollection');
    }

    const featuresMap = new Map<string, Feature>();

    for (const feature of featureCollection.features) {
      // Try to extract code from properties
      const code = feature.properties?.code || feature.properties?.Code || feature.properties?.CODE;
      
      if (!code) {
        // Skip features without code
        continue;
      }

      if (featuresMap.has(code)) {
        throw new BadRequestException(`Duplicate feature with code: ${code}`);
      }

      featuresMap.set(code, feature);
    }

    return featuresMap;
  }

  /**
   * Check if a point is within a geometry
   */
  isPointWithin(point: [number, number], geometry: AdminGeometry): boolean {
    const pt = turf.point(point);
    const poly = turf.feature(geometry);
    return turf.booleanPointInPolygon(pt, poly);
  }

  /**
   * Check if geometries intersect
   */
  intersects(geometry1: AdminGeometry, geometry2: AdminGeometry): boolean {
    const feature1 = turf.feature(geometry1);
    const feature2 = turf.feature(geometry2);
    
    try {
      const intersection = turf.intersect(feature1 as any, feature2 as any);
      return intersection !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert WKT to GeoJSON (basic implementation)
   */
  wktToGeoJSON(wkt: string): AdminGeometry {
    // This is a simplified implementation
    // In production, use a library like wellknown or wkt-parser
    throw new BadRequestException('WKT conversion not yet implemented. Please provide GeoJSON.');
  }

  /**
   * Convert GeoJSON to WKT (basic implementation)
   */
  geoJSONToWKT(geometry: AdminGeometry): string {
    // This is a simplified implementation
    // In production, use a library like wellknown
    throw new BadRequestException('WKT export not yet implemented. Please use GeoJSON format.');
  }

  /**
   * Validate file size for geometry uploads
   */
  validateFileSize(data: any, maxSizeInMB: number = 10): void {
    const jsonString = JSON.stringify(data);
    const sizeInMB = Buffer.byteLength(jsonString, 'utf8') / (1024 * 1024);
    
    if (sizeInMB > maxSizeInMB) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSizeInMB}MB. Current size: ${sizeInMB.toFixed(2)}MB`
      );
    }
  }
}
