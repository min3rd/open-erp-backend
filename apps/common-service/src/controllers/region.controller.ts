import {
  Controller,
  Get,
  Query,
  HttpStatus,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProvinceService } from '../services/province.service';
import { DistrictService } from '../services/district.service';
import { WardService } from '../services/ward.service';
import { error, ok } from '@shared/response';
import { GeometryDetail } from '@shared/types/geometry.types';

/**
 * Interface for spatial query results
 */
export interface SpatialResult {
  provinces?: unknown[];
  districts?: unknown[];
  wards?: unknown[];
}

/**
 * Controller for spatial queries across administrative regions
 */
@ApiTags('regions')
@Controller('regions')
export class RegionController {
  constructor(
    private readonly provinceService: ProvinceService,
    private readonly districtService: DistrictService,
    private readonly wardService: WardService,
  ) {}

  @Get('within')
  @ApiOperation({
    summary: 'Find administrative regions within a bounding box',
    description:
      'Spatial query to find provinces, districts, and wards within a bounding box',
  })
  @ApiQuery({
    name: 'bbox',
    required: true,
    example: '105.0,20.0,106.0,21.0',
    description: 'Bounding box: minLon,minLat,maxLon,maxLat',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['province', 'district', 'ward', 'all'],
    description: 'Type of administrative region to query',
  })
  @ApiQuery({
    name: 'detail',
    required: false,
    enum: GeometryDetail,
    description: 'Geometry detail level',
  })
  @ApiResponse({
    status: 200,
    description: 'Regions found within bounding box',
  })
  @ApiResponse({ status: 400, description: 'Invalid bounding box format' })
  async findWithinBBox(
    @Query('bbox') bboxStr: string,
    @Query('type') type: string = 'all',
    @Query('detail') detail?: GeometryDetail,
  ) {
    try {
      // Parse bounding box
      const bboxParts = bboxStr.split(',').map(parseFloat);
      if (bboxParts.length !== 4 || bboxParts.some(isNaN)) {
        throw new BadRequestException(
          'Invalid bbox format. Expected: minLon,minLat,maxLon,maxLat',
        );
      }

      const bbox: [number, number, number, number] = bboxParts as [
        number,
        number,
        number,
        number,
      ];

      const result: SpatialResult = {};

      // Query based on type
      if (type === 'province' || type === 'all') {
        result.provinces = await this.provinceService.findWithinBBox(bbox);
      }

      if (type === 'district' || type === 'all') {
        result.districts = await this.districtService.findWithinBBox(bbox);
      }

      if (type === 'ward' || type === 'all') {
        result.wards = await this.wardService.findWithinBBox(bbox);
      }

      // Simplify geometry if requested
      if (detail === GeometryDetail.SIMPLE) {
        this.simplifyResultGeometry(result);
      }

      return ok(result);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to query regions';
      throw new HttpException(
        error('SPATIAL_QUERY_ERROR', errorMessage),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('near')
  @ApiOperation({
    summary: 'Find administrative regions near a point',
    description:
      'Spatial query to find provinces, districts, and wards near a coordinate',
  })
  @ApiQuery({
    name: 'lon',
    required: true,
    type: Number,
    example: 105.8542,
    description: 'Longitude',
  })
  @ApiQuery({
    name: 'lat',
    required: true,
    type: Number,
    example: 21.0285,
    description: 'Latitude',
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    type: Number,
    example: 10000,
    description: 'Maximum distance in meters',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['province', 'district', 'ward', 'all'],
    description: 'Type of administrative region to query',
  })
  @ApiQuery({
    name: 'detail',
    required: false,
    enum: GeometryDetail,
    description: 'Geometry detail level',
  })
  @ApiResponse({
    status: 200,
    description: 'Regions found near the point',
  })
  @ApiResponse({ status: 400, description: 'Invalid coordinates' })
  async findNearPoint(
    @Query('lon') lon: number,
    @Query('lat') lat: number,
    @Query('radius') radius?: number,
    @Query('type') type: string = 'all',
    @Query('detail') detail?: GeometryDetail,
  ) {
    try {
      // Validate coordinates
      const longitude = parseFloat(String(lon));
      const latitude = parseFloat(String(lat));

      if (isNaN(longitude) || isNaN(latitude)) {
        throw new BadRequestException('Invalid coordinates');
      }

      if (
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
      ) {
        throw new BadRequestException('Coordinates out of valid range');
      }

      const result: SpatialResult = {};

      // Query based on type
      if (type === 'province' || type === 'all') {
        result.provinces = await this.provinceService.findNearPoint(
          longitude,
          latitude,
          radius,
        );
      }

      if (type === 'district' || type === 'all') {
        result.districts = await this.districtService.findNearPoint(
          longitude,
          latitude,
          radius,
        );
      }

      if (type === 'ward' || type === 'all') {
        result.wards = await this.wardService.findNearPoint(
          longitude,
          latitude,
          radius,
        );
      }

      // Simplify geometry if requested
      if (detail === GeometryDetail.SIMPLE) {
        this.simplifyResultGeometry(result);
      }

      return ok(result);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to query regions';
      throw new HttpException(
        error('SPATIAL_QUERY_ERROR', errorMessage),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Helper to simplify geometry in results
   */
  private simplifyResultGeometry(result: SpatialResult): void {
    const simplifyItems = (items?: unknown[]) => {
      items?.forEach((item: Record<string, unknown>) => {
        if (item.geometrySimplified) {
          item.geometry = item.geometrySimplified;
          delete item.geometrySimplified;
        }
      });
    };

    if (result.provinces) simplifyItems(result.provinces);
    if (result.districts) simplifyItems(result.districts);
    if (result.wards) simplifyItems(result.wards);
  }
}
