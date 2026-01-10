import { Injectable, NotFoundException } from '@nestjs/common';
import { WardRepository } from '../repositories/ward.repository';
import { Ward } from '@shared/schemas';
import { BBox } from '@shared/types/geometry.types';

@Injectable()
export class WardService {
  constructor(private readonly wardRepository: WardRepository) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    provinceCode?: string;
    districtCode?: string;
    q?: string;
    version?: string;
    isLegacy?: boolean;
  }): Promise<{ items: Ward[]; total: number }> {
    const {
      page = 1,
      limit = 100,
      provinceCode,
      districtCode,
      q,
      version,
      isLegacy,
    } = options;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (provinceCode) {
      filter.provinceCode = provinceCode;
    }
    if (districtCode) {
      filter.districtCode = districtCode;
    }
    if (version) {
      filter.version = version;
    }
    if (isLegacy !== undefined) {
      filter.isLegacy = isLegacy;
    }

    if (q) {
      return this.wardRepository.search(q, filter, { skip, limit });
    }

    return this.wardRepository.findAll(filter, {
      skip,
      limit,
      sort: { sortOrder: 1, name: 1 },
    });
  }

  async findByCode(code: string): Promise<Ward> {
    const ward = await this.wardRepository.findByCode(code);
    if (!ward) {
      throw new NotFoundException(`Ward with code ${code} not found`);
    }
    return ward;
  }

  async findByProvinceCode(provinceCode: string): Promise<Ward[]> {
    return this.wardRepository.findByProvinceCode(provinceCode);
  }

  async findByDistrictCode(districtCode: string): Promise<Ward[]> {
    return this.wardRepository.findByDistrictCode(districtCode);
  }

  async create(data: Partial<Ward>): Promise<Ward> {
    return this.wardRepository.create(data);
  }

  async update(code: string, data: Partial<Ward>): Promise<Ward> {
    const ward = await this.wardRepository.update(code, data);
    if (!ward) {
      throw new NotFoundException(`Ward with code ${code} not found`);
    }
    return ward;
  }

  async delete(code: string): Promise<void> {
    const ward = await this.wardRepository.delete(code);
    if (!ward) {
      throw new NotFoundException(`Ward with code ${code} not found`);
    }
  }

  /**
   * Find wards within bounding box
   */
  async findWithinBBox(bbox: BBox): Promise<Ward[]> {
    return this.wardRepository.findWithinBBox(bbox);
  }

  /**
   * Find wards near a point
   */
  async findNearPoint(
    longitude: number,
    latitude: number,
    maxDistanceMeters?: number,
  ): Promise<Ward[]> {
    return this.wardRepository.findNearPoint(
      longitude,
      latitude,
      maxDistanceMeters,
    );
  }
}
