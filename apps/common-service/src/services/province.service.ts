import { Injectable, NotFoundException } from '@nestjs/common';
import { ProvinceRepository } from '../repositories/province.repository';
import { Province } from '@shared/schemas';

@Injectable()
export class ProvinceService {
  constructor(private readonly provinceRepository: ProvinceRepository) {}

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
}
