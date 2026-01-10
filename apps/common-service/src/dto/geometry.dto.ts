import {
  IsEnum,
  IsOptional,
  IsNumber,
  IsString,
  IsObject,
  ValidateNested,
  IsArray,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GeometrySource, GeometryDetail } from '@shared/types/geometry.types';

/**
 * DTO for centroid coordinates
 */
export class CentroidDto {
  @ApiProperty({ example: 21.0285, description: 'Latitude' })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 105.8542, description: 'Longitude' })
  @IsNumber()
  lon: number;
}

/**
 * DTO for bounding box [minLon, minLat, maxLon, maxLat]
 */
export class BBoxDto {
  @ApiProperty({
    example: [105.0, 20.0, 106.0, 21.0],
    description: 'Bounding box [minLon, minLat, maxLon, maxLat]',
  })
  @IsArray()
  @IsNumber({}, { each: true })
  bbox: [number, number, number, number];
}

/**
 * DTO for geometry metadata
 */
export class GeometryMetaDto {
  @ApiPropertyOptional({
    example: 'EPSG:4326',
    description: 'Coordinate Reference System',
  })
  @IsOptional()
  @IsString()
  crs?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Simplification level (0-10)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  simplificationLevel?: number;

  @ApiPropertyOptional({ example: 100, description: 'Accuracy in meters' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Data source details' })
  @IsOptional()
  @IsString()
  source?: string;
}

/**
 * DTO for updating geometry
 */
export class UpdateGeometryDto {
  @ApiProperty({ description: 'GeoJSON Polygon or MultiPolygon' })
  @IsObject()
  geometry: any;

  @ApiPropertyOptional({ enum: GeometrySource })
  @IsOptional()
  @IsEnum(GeometrySource)
  geometrySource?: GeometrySource;

  @ApiPropertyOptional({ type: GeometryMetaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeometryMetaDto)
  geometryMeta?: GeometryMetaDto;

  @ApiPropertyOptional({ description: 'User ID who is updating the geometry' })
  @IsOptional()
  @IsString()
  updatedBy?: string;
}

/**
 * DTO for importing GeoJSON FeatureCollection
 */
export class ImportGeoJsonDto {
  @ApiProperty({ description: 'GeoJSON FeatureCollection' })
  @IsObject()
  featureCollection: any;

  @ApiPropertyOptional({
    enum: GeometrySource,
    default: GeometrySource.UPLOADED,
  })
  @IsOptional()
  @IsEnum(GeometrySource)
  geometrySource?: GeometrySource;

  @ApiPropertyOptional({ type: GeometryMetaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeometryMetaDto)
  geometryMeta?: GeometryMetaDto;

  @ApiPropertyOptional({ description: 'Simplification tolerance (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  simplificationTolerance?: number;
}

/**
 * DTO for spatial query parameters
 */
export class SpatialQueryDto {
  @ApiPropertyOptional({
    example: '105.0,20.0,106.0,21.0',
    description: 'Bounding box: minLon,minLat,maxLon,maxLat',
  })
  @IsOptional()
  @IsString()
  bbox?: string;

  @ApiPropertyOptional({
    example: '105.8542,21.0285',
    description: 'Point coordinates: lon,lat',
  })
  @IsOptional()
  @IsString()
  point?: string;

  @ApiPropertyOptional({
    example: 10000,
    description: 'Radius in meters for point queries',
  })
  @IsOptional()
  @IsNumber()
  radius?: number;

  @ApiPropertyOptional({ enum: GeometryDetail, default: GeometryDetail.SIMPLE })
  @IsOptional()
  @IsEnum(GeometryDetail)
  detail?: GeometryDetail;
}

/**
 * DTO for export format
 */
export class ExportGeometryDto {
  @ApiPropertyOptional({
    example: 'geojson',
    enum: ['geojson', 'wkt'],
    default: 'geojson',
  })
  @IsOptional()
  @IsIn(['geojson', 'wkt'])
  format?: string;

  @ApiPropertyOptional({ enum: GeometryDetail, default: GeometryDetail.FULL })
  @IsOptional()
  @IsEnum(GeometryDetail)
  detail?: GeometryDetail;
}
