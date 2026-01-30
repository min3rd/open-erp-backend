import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DistrictRepository } from '../repositories/district.repository';
import { District } from '@shared/schemas';
import { BBox } from '@shared/types/geometry.types';

@Injectable()
export class DistrictService {
  private readonly logger = new Logger(DistrictService.name);

  constructor(private readonly districtRepository: DistrictRepository) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    provinceCode?: string;
    q?: string;
    version?: string;
    isLegacy?: boolean;
  }): Promise<{ items: District[]; total: number }> {
    const {
      page = 1,
      limit = 100,
      provinceCode,
      q,
      version,
      isLegacy,
    } = options;
    const skip = (page - 1) * limit;

    this.logger.debug(`Finding districts with options: ${JSON.stringify({ page, limit, provinceCode, q })}`);

    const filter: any = {};
    if (provinceCode) {
      filter.provinceCode = provinceCode;
    }
    if (version) {
      filter.version = version;
    }
    if (isLegacy !== undefined) {
      filter.isLegacy = isLegacy;
    }

    if (q) {
      return this.districtRepository.search(q, filter, { skip, limit });
    }

    return this.districtRepository.findAll(filter, {
      skip,
      limit,
      sort: { sortOrder: 1, name: 1 },
    });
  }

  async findByCode(code: string): Promise<District> {
    this.logger.debug(`Finding district by code: ${code}`);
    const district = await this.districtRepository.findByCode(code);
    if (!district) {
      this.logger.warn(`District not found: ${code}`);
      throw new NotFoundException(`District with code ${code} not found`);
    }
    return district;
  }

  async findByProvinceCode(provinceCode: string): Promise<District[]> {
    this.logger.debug(`Finding districts by province code: ${provinceCode}`);
    return this.districtRepository.findByProvinceCode(provinceCode);
  }

  async create(data: Partial<District>): Promise<District> {
    this.logger.log(`Creating district: ${data.code}`);
    const district = await this.districtRepository.create(data);
    this.logger.log(`Created district: ${district.code}`);
    return district;
  }

  async update(code: string, data: Partial<District>): Promise<District> {
    this.logger.log(`Updating district: ${code}`);
    const district = await this.districtRepository.update(code, data);
    if (!district) {
      this.logger.warn(`District not found for update: ${code}`);
      throw new NotFoundException(`District with code ${code} not found`);
    }
    this.logger.log(`Updated district: ${code}`);
    return district;
  }

  async delete(code: string): Promise<void> {
    this.logger.log(`Deleting district: ${code}`);
    const district = await this.districtRepository.delete(code);
    if (!district) {
      this.logger.warn(`District not found for deletion: ${code}`);
      throw new NotFoundException(`District with code ${code} not found`);
    }
    this.logger.log(`Deleted district: ${code}`);
  }

  /**
   * Find districts within bounding box
   */
  async findWithinBBox(bbox: BBox): Promise<District[]> {
    this.logger.debug(`Finding districts within bbox: ${JSON.stringify(bbox)}`);
    return this.districtRepository.findWithinBBox(bbox);
  }

  /**
   * Find districts near a point
   */
  async findNearPoint(
    longitude: number,
    latitude: number,
    maxDistanceMeters?: number,
  ): Promise<District[]> {
    this.logger.debug(`Finding districts near point: [${longitude}, ${latitude}]`);
    return this.districtRepository.findNearPoint(
      longitude,
      latitude,
      maxDistanceMeters,
    );
  }
}

