import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProvinceRepository } from '../repositories/province.repository';
import { Province } from '@shared/schemas';
import { GeometryUtilService } from './geometry-util.service';
import { GeometryVersionService } from './geometry-version.service';
import { AdminGeometry, BBox, GeometrySource, GeometryMeta, GeometryDetail } from '@shared/types/geometry.types';
import { FeatureCollection } from 'geojson';

@Injectable()
export class ProvinceService {
  constructor(
    private readonly provinceRepository: ProvinceRepository,
    private readonly geometryUtilService: GeometryUtilService,
    private readonly geometryVersionService: GeometryVersionService,
  ) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    region?: string;
    q?: string;
    version?: string;
    isLegacy?: boolean;
  }): Promise<{ items: Province[]; total: number }> {
    const { page = 1, limit = 100, region, q, version, isLegacy } = options;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (region) {
      filter.region = region;
    }
    if (version) {
      filter.version = version;
    }
    if (isLegacy !== undefined) {
      filter.isLegacy = isLegacy;
    }

    if (q) {
      return this.provinceRepository.search(q, filter, { skip, limit });
    }

    return this.provinceRepository.findAll(filter, {
      skip,
      limit,
      sort: { sortOrder: 1, name: 1 },
    });
  }

  async findByCode(code: string): Promise<Province> {
    const province = await this.provinceRepository.findByCode(code);
    if (!province) {
      throw new NotFoundException(`Province with code ${code} not found`);
    }
    return province;
  }

  async create(data: Partial<Province>): Promise<Province> {
    return this.provinceRepository.create(data);
  }

  async update(code: string, data: Partial<Province>): Promise<Province> {
    const province = await this.provinceRepository.update(code, data);
    if (!province) {
      throw new NotFoundException(`Province with code ${code} not found`);
    }
    return province;
  }

  async delete(code: string): Promise<void> {
    const province = await this.provinceRepository.delete(code);
    if (!province) {
      throw new NotFoundException(`Province with code ${code} not found`);
    }
  }

  /**
   * Get geometry for a province
   */
  async getGeometry(code: string, detail: GeometryDetail = GeometryDetail.FULL): Promise<any> {
    const province = await this.findByCode(code);
    
    if (!province.geometry) {
      throw new NotFoundException(`Province ${code} has no geometry data`);
    }

    const geometry = detail === GeometryDetail.SIMPLE 
      ? province.geometrySimplified || province.geometry
      : province.geometry;

    return {
      geometry,
      centroid: province.centroid,
      bbox: province.bbox,
      areaSqKm: province.areaSqKm,
      geometrySource: province.geometrySource,
      geometryVersion: province.geometryVersion,
      geometryUpdatedAt: province.geometryUpdatedAt,
      geometryMeta: province.geometryMeta,
    };
  }

  /**
   * Update geometry for a province
   */
  async updateGeometry(
    code: string,
    geometry: AdminGeometry,
    updatedBy?: string,
    geometrySource: GeometrySource = GeometrySource.UPLOADED,
    geometryMeta?: GeometryMeta,
    simplificationTolerance?: number,
  ): Promise<Province> {
    const province = await this.findByCode(code);

    // Validate and process geometry
    this.geometryUtilService.validateFileSize(geometry);
    const processed = this.geometryUtilService.processGeometry(
      geometry,
      simplificationTolerance,
    );

    // Get current version number
    const currentVersion = province.geometryVersion || 0;
    const newVersion = currentVersion + 1;

    // Create version snapshot if geometry exists
    if (province.geometry) {
      await this.geometryVersionService.createVersion(
        'province',
        code,
        currentVersion,
        province.geometry,
        updatedBy,
        'Geometry updated',
        province.geometryMeta,
      );
    }

    // Update province
    const updated = await this.provinceRepository.updateGeometry(code, {
      geometry: processed.geometry,
      geometrySimplified: processed.geometrySimplified,
      centroid: processed.centroid,
      bbox: processed.bbox,
      areaSqKm: processed.areaSqKm,
      geometrySource,
      geometryVersion: newVersion,
      geometryUpdatedBy: updatedBy,
      geometryMeta,
    });

    if (!updated) {
      throw new NotFoundException(`Province with code ${code} not found`);
    }

    return updated;
  }

  /**
   * Import geometries from GeoJSON FeatureCollection
   */
  async importGeoJSON(
    featureCollection: FeatureCollection,
    geometrySource: GeometrySource = GeometrySource.UPLOADED,
    geometryMeta?: GeometryMeta,
    simplificationTolerance?: number,
    updatedBy?: string,
  ): Promise<{ success: string[]; failed: Array<{ code: string; error: string }> }> {
    // Validate file size
    this.geometryUtilService.validateFileSize(featureCollection);

    // Parse features
    const featuresMap = this.geometryUtilService.parseFeatureCollection(featureCollection);

    const success: string[] = [];
    const failed: Array<{ code: string; error: string }> = [];

    // Process each feature
    for (const [code, feature] of featuresMap.entries()) {
      try {
        const geometry = feature.geometry as AdminGeometry;
        
        // Check if province exists
        const province = await this.provinceRepository.findByCode(code);
        if (!province) {
          failed.push({ code, error: 'Province not found' });
          continue;
        }

        // Update geometry
        await this.updateGeometry(
          code,
          geometry,
          updatedBy,
          geometrySource,
          geometryMeta,
          simplificationTolerance,
        );

        success.push(code);
      } catch (error) {
        failed.push({ code, error: error.message });
      }
    }

    return { success, failed };
  }

  /**
   * Export geometry as GeoJSON
   */
  async exportGeoJSON(code: string, detail: GeometryDetail = GeometryDetail.FULL): Promise<any> {
    const province = await this.findByCode(code);
    
    if (!province.geometry) {
      throw new NotFoundException(`Province ${code} has no geometry data`);
    }

    const geometry = detail === GeometryDetail.SIMPLE
      ? province.geometrySimplified || province.geometry
      : province.geometry;

    return {
      type: 'Feature',
      properties: {
        code: province.code,
        name: province.name,
        nameEn: province.nameEn,
        region: province.region,
        centroid: province.centroid,
        bbox: province.bbox,
        areaSqKm: province.areaSqKm,
        geometrySource: province.geometrySource,
        geometryVersion: province.geometryVersion,
      },
      geometry,
    };
  }

  /**
   * Find provinces within bounding box
   */
  async findWithinBBox(bbox: BBox): Promise<Province[]> {
    return this.provinceRepository.findWithinBBox(bbox);
  }

  /**
   * Find provinces intersecting with geometry
   */
  async findIntersecting(geometry: AdminGeometry): Promise<Province[]> {
    this.geometryUtilService.validateGeometry(geometry);
    return this.provinceRepository.findIntersecting(geometry);
  }

  /**
   * Find provinces near a point
   */
  async findNearPoint(
    longitude: number,
    latitude: number,
    maxDistanceMeters?: number,
  ): Promise<Province[]> {
    return this.provinceRepository.findNearPoint(longitude, latitude, maxDistanceMeters);
  }

  /**
   * Get geometry version history
   */
  async getGeometryVersionHistory(code: string, limit: number = 10): Promise<any[]> {
    await this.findByCode(code); // Verify province exists
    return this.geometryVersionService.getVersionHistory('province', code, limit);
  }

  /**
   * Rollback to a specific geometry version
   */
  async rollbackGeometryVersion(
    code: string,
    version: number,
    updatedBy?: string,
  ): Promise<Province> {
    const province = await this.findByCode(code);
    
    // Get the version
    const versionDoc = await this.geometryVersionService.getVersion('province', code, version);
    if (!versionDoc) {
      throw new NotFoundException(`Version ${version} not found for province ${code}`);
    }

    // Update with the old geometry
    return this.updateGeometry(
      code,
      versionDoc.geometry,
      updatedBy,
      province.geometrySource,
      versionDoc.geometryMeta,
    );
  }
}
