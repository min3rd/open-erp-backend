import { Injectable, NotFoundException } from '@nestjs/common';
import { DistrictRepository } from '../repositories/district.repository';
import { District } from '@shared/schemas';
import { BBox } from '@shared/types/geometry.types';

@Injectable()
export class DistrictService {
  constructor(private readonly districtRepository: DistrictRepository) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    provinceCode?: string;
    q?: string;
    version?: string;
    isLegacy?: boolean;
  }): Promise<{ items: District[]; total: number }> {
    const { page = 1, limit = 100, provinceCode, q, version, isLegacy } = options;
    const skip = (page - 1) * limit;

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
    const district = await this.districtRepository.findByCode(code);
    if (!district) {
      throw new NotFoundException(`District with code ${code} not found`);
    }
    return district;
  }

  async findByProvinceCode(provinceCode: string): Promise<District[]> {
    return this.districtRepository.findByProvinceCode(provinceCode);
  }

  async create(data: Partial<District>): Promise<District> {
    return this.districtRepository.create(data);
  }

  async update(code: string, data: Partial<District>): Promise<District> {
    const district = await this.districtRepository.update(code, data);
    if (!district) {
      throw new NotFoundException(`District with code ${code} not found`);
    }
    return district;
  }

  async delete(code: string): Promise<void> {
    const district = await this.districtRepository.delete(code);
    if (!district) {
      throw new NotFoundException(`District with code ${code} not found`);
    }
  }

  /**
   * Find districts within bounding box
   */
  async findWithinBBox(bbox: BBox): Promise<District[]> {
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
    return this.districtRepository.findNearPoint(longitude, latitude, maxDistanceMeters);
  }
}
