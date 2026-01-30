import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GeometryVersion, GeometryVersionDocument } from '@shared/schemas';
import { AdminGeometry, GeometryMeta } from '@shared/types/geometry.types';

/**
 * Service for managing geometry version history
 */
@Injectable()
export class GeometryVersionService {
  private readonly logger = new Logger(GeometryVersionService.name);

  constructor(
    @InjectModel(GeometryVersion.name)
    private readonly geometryVersionModel: Model<GeometryVersionDocument>,
  ) {}

  /**
   * Create a version snapshot
   */
  async createVersion(
    entityType: 'province' | 'district' | 'ward',
    entityCode: string,
    version: number,
    geometry: AdminGeometry,
    updatedBy?: string,
    changeDescription?: string,
    geometryMeta?: GeometryMeta,
  ): Promise<GeometryVersion> {
    this.logger.log(`Creating geometry version ${version} for ${entityType}:${entityCode}`);
    const versionDoc = new this.geometryVersionModel({
      entityType,
      entityCode,
      version,
      geometry,
      updatedBy,
      changeDescription,
      geometryMeta,
      snapshotDate: new Date(),
    });

    return versionDoc.save();
  }

  /**
   * Get version history for an entity
   */
  async getVersionHistory(
    entityType: 'province' | 'district' | 'ward',
    entityCode: string,
    limit: number = 10,
  ): Promise<GeometryVersion[]> {
    return this.geometryVersionModel
      .find({ entityType, entityCode })
      .sort({ version: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get a specific version
   */
  async getVersion(
    entityType: 'province' | 'district' | 'ward',
    entityCode: string,
    version: number,
  ): Promise<GeometryVersion | null> {
    return this.geometryVersionModel
      .findOne({ entityType, entityCode, version })
      .exec();
  }

  /**
   * Get latest version number
   */
  async getLatestVersionNumber(
    entityType: 'province' | 'district' | 'ward',
    entityCode: string,
  ): Promise<number> {
    const latest = await this.geometryVersionModel
      .findOne({ entityType, entityCode })
      .sort({ version: -1 })
      .select('version')
      .exec();

    return latest ? latest.version : 0;
  }

  /**
   * Delete all versions for an entity (cascade delete)
   */
  async deleteVersions(
    entityType: 'province' | 'district' | 'ward',
    entityCode: string,
  ): Promise<void> {
    this.logger.log(`Deleting all geometry versions for ${entityType}:${entityCode}`);
    await this.geometryVersionModel
      .deleteMany({ entityType, entityCode })
      .exec();
    this.logger.log(`Deleted geometry versions for ${entityType}:${entityCode}`);
  }
}
