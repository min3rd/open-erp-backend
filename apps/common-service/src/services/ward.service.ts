import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { WardRepository } from '../repositories/ward.repository';
import { Ward } from '@shared/schemas';
import { BBox } from '@shared/types/geometry.types';

@Injectable()
export class WardService {
  private readonly logger = new Logger(WardService.name);

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

    this.logger.debug(
      `Finding wards with options: ${JSON.stringify({ page, limit, provinceCode, districtCode, q })}`,
    );

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
    this.logger.debug(`Finding ward by code: ${code}`);
    const ward = await this.wardRepository.findByCode(code);
    if (!ward) {
      this.logger.warn(`Ward not found: ${code}`);
      throw new NotFoundException(`Ward with code ${code} not found`);
    }
    return ward;
  }

  async findByProvinceCode(provinceCode: string): Promise<Ward[]> {
    this.logger.debug(`Finding wards by province code: ${provinceCode}`);
    return this.wardRepository.findByProvinceCode(provinceCode);
  }

  async findByDistrictCode(districtCode: string): Promise<Ward[]> {
    this.logger.debug(`Finding wards by district code: ${districtCode}`);
    return this.wardRepository.findByDistrictCode(districtCode);
  }

  async create(data: Partial<Ward>): Promise<Ward> {
    this.logger.log(`Creating ward: ${data.code}`);
    const ward = await this.wardRepository.create(data);
    this.logger.log(`Created ward: ${ward.code}`);
    return ward;
  }

  async update(code: string, data: Partial<Ward>): Promise<Ward> {
    this.logger.log(`Updating ward: ${code}`);
    const ward = await this.wardRepository.update(code, data);
    if (!ward) {
      this.logger.warn(`Ward not found for update: ${code}`);
      throw new NotFoundException(`Ward with code ${code} not found`);
    }
    this.logger.log(`Updated ward: ${code}`);
    return ward;
  }

  async delete(code: string): Promise<void> {
    this.logger.log(`Deleting ward: ${code}`);
    const ward = await this.wardRepository.delete(code);
    if (!ward) {
      this.logger.warn(`Ward not found for deletion: ${code}`);
      throw new NotFoundException(`Ward with code ${code} not found`);
    }
    this.logger.log(`Deleted ward: ${code}`);
  }

  /**
   * Find wards within bounding box
   */
  async findWithinBBox(bbox: BBox): Promise<Ward[]> {
    this.logger.debug(`Finding wards within bbox: ${JSON.stringify(bbox)}`);
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
    this.logger.debug(`Finding wards near point: [${longitude}, ${latitude}]`);
    return this.wardRepository.findNearPoint(
      longitude,
      latitude,
      maxDistanceMeters,
    );
  }
}
